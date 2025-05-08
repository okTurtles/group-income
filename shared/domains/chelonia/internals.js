'use strict'

import sbp, { domainFromSelector } from '@sbp/sbp'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'
import { multicodes } from '~/shared/functions.js'
import { cloneDeep, debounce, delay, has, pick, randomIntFromRange } from 'turtledash'
import type { SPKey, SPOpActionEncrypted, SPOpActionUnencrypted, SPOpAtomic, SPOpContract, SPOpKeyAdd, SPOpKeyDel, SPOpKeyRequest, SPOpKeyRequestSeen, SPOpKeyShare, SPOpKeyUpdate, SPOpPropSet, SPOpType, ProtoSPOpKeyRequestSeen, ProtoSPOpKeyShare } from './SPMessage.js'
import { SPMessage } from './SPMessage.js'
import { Secret } from './Secret.js'
import { INVITE_STATUS } from './constants.js'
import { deserializeKey, keyId, verifySignature } from '@chelonia/crypto'
import './db.js'
import { encryptedIncomingData, encryptedOutgoingData, unwrapMaybeEncryptedData } from './encryptedData.js'
import type { EncryptedData } from './encryptedData.js'
import { ChelErrorKeyAlreadyExists, ChelErrorResourceGone, ChelErrorUnrecoverable, ChelErrorWarning, ChelErrorDBBadPreviousHEAD, ChelErrorAlreadyProcessed, ChelErrorFetchServerTimeFailed, ChelErrorForkedChain } from './errors.js'
import { CONTRACTS_MODIFIED, CONTRACT_HAS_RECEIVED_KEYS, CONTRACT_IS_SYNCING, EVENT_HANDLED, EVENT_PUBLISHED, EVENT_PUBLISHING_ERROR } from './events.js'
import { buildShelterAuthorizationHeader, findKeyIdByName, findSuitablePublicKeyIds, findSuitableSecretKeyId, getContractIDfromKeyId, keyAdditionProcessor, logEvtError, recreateEvent, validateKeyPermissions, validateKeyAddPermissions, validateKeyDelPermissions, validateKeyUpdatePermissions } from './utils.js'
import { isSignedData, signedIncomingData } from './signedData.js'
// import 'ses'

// Used for temporarily storing the missing decryption key IDs in a given
// message
const missingDecryptionKeyIdsMap = new WeakMap()

const getMsgMeta = (message: SPMessage, contractID: string, state: Object, index?: number) => {
  const signingKeyId = message.signingKeyId()
  let innerSigningKeyId: ?string = null

  const result = {
    signingKeyId,
    get signingContractID () {
      return getContractIDfromKeyId(contractID, signingKeyId, state)
    },
    get innerSigningKeyId () {
      if (innerSigningKeyId === null) {
        const value = message.message()
        const data = unwrapMaybeEncryptedData(value)
        if (data?.data && isSignedData(data.data)) {
          innerSigningKeyId = (data.data: any).signingKeyId
        } else {
          innerSigningKeyId = undefined
        }
        return innerSigningKeyId
      }
    },
    get innerSigningContractID () {
      return getContractIDfromKeyId(contractID, result.innerSigningKeyId, state)
    },
    index
  }

  return result
}

const keysToMap = (keys: (SPKey | EncryptedData<SPKey>)[], height: number, authorizedKeys?: Object): Object => {
  // Using cloneDeep to ensure that the returned object is serializable
  // Keys in a SPMessage may not be serializable (i.e., supported by the
  // structured clone algorithm) when they contain encryptedIncomingData
  keys = keys.map((key) => {
    const data = unwrapMaybeEncryptedData(key)
    if (!data) return undefined
    if (data.encryptionKeyId) {
      data.data._private = data.encryptionKeyId
    }
    return ((data.data: any): SPKey)
  }).filter(Boolean)

  const keysCopy = cloneDeep(keys)
  return Object.fromEntries(keysCopy.map((key, i) => {
    key._notBeforeHeight = height
    if (authorizedKeys?.[key.id]) {
      if (authorizedKeys[key.id]._notAfterHeight == null) {
        throw new ChelErrorKeyAlreadyExists(`Cannot set existing unrevoked key: ${key.id}`)
      }
      // If the key was get previously, preserve its _notBeforeHeight
      // NOTE: (SECURITY) This may allow keys for periods for which it wasn't
      // supposed to be active. This is a trade-off for simplicity, instead of
      // considering discrete periods, which is the correct solution
      // Discrete ranges *MUST* be implemented because they impact permissions
      key._notBeforeHeight = Math.min(height, authorizedKeys[key.id]._notBeforeHeight ?? 0)
    } else {
      key._notBeforeHeight = height
    }
    delete key._notAfterHeight
    return [key.id, key]
  }))
}

const keyRotationHelper = (contractID: string, state: Object, config: Object, updatedKeysMap: Object, requiredPermissions: string[], outputSelector: string, outputMapper: (name: [string, string]) => any, internalSideEffectStack?: any[]) => {
  if (!internalSideEffectStack || !Array.isArray(state._volatile?.watch)) return

  const rootState = sbp(config.stateSelector)
  const watchMap = Object.create(null)

  state._volatile.watch.forEach(([name, cID]) => {
    if (!updatedKeysMap[name] || watchMap[cID] === null) {
      return
    }
    if (!watchMap[cID]) {
      if (!rootState.contracts[cID]?.type || !findSuitableSecretKeyId(rootState[cID], [SPMessage.OP_KEY_UPDATE], ['sig'])) {
        watchMap[cID] = null
        return
      }

      watchMap[cID] = []
    }

    watchMap[cID].push(name)
  })

  Object.entries((watchMap: Object)).forEach(([cID, names]) => {
    if (!Array.isArray(names) || !names.length) return

    const [keyNamesToUpdate, signingKeyId] = names.map((name) => {
      const foreignContractKey = rootState[cID]?._vm?.authorizedKeys?.[updatedKeysMap[name].oldKeyId]

      if (!foreignContractKey) return undefined

      const signingKeyId = findSuitableSecretKeyId(rootState[cID], requiredPermissions, ['sig'], foreignContractKey.ringLevel)

      if (signingKeyId) {
        return [[name, foreignContractKey.name], signingKeyId, rootState[cID]._vm.authorizedKeys[signingKeyId].ringLevel]
      }

      return undefined
    }).filter(Boolean).reduce((acc, [name, signingKeyId, ringLevel]) => {
      // $FlowFixMe
      acc[0].push(name)
      return ringLevel < acc[2] ? [acc[0], signingKeyId, ringLevel] : acc
    }, [[], undefined, Number.POSITIVE_INFINITY])

    if (!signingKeyId) return

    // Send output based on keyNamesToUpdate, signingKeyId
    const contractName = rootState.contracts[cID]?.type

    internalSideEffectStack?.push(() => {
      // We can't await because it'll block on a different contract, which
      // is possibly waiting on this current contract.
      sbp(outputSelector, {
        contractID: cID,
        contractName,
        data: keyNamesToUpdate.map(outputMapper).map((v, i) => {
          return v
        }),
        signingKeyId
      }).catch((e) => {
        console.warn(`Error mirroring key operation (${outputSelector}) from ${contractID} to ${cID}: ${e?.message || e}`)
      })
    })
  })
}

// export const FERAL_FUNCTION = Function

export default (sbp('sbp/selectors/register', {
  //     DO NOT CALL ANY OF THESE YOURSELF!
  'chelonia/private/state': function () {
    return this.state
  },
  'chelonia/private/invoke': function (instance, invocation) {
    // If this._instance !== instance (i.e., chelonia/reset was called)
    if (this._instance !== instance) {
      console.info('[\'chelonia/private/invoke] Not proceeding with invocation as Chelonia was restarted', { invocation })
      return
    }
    if (Array.isArray(invocation)) {
      return sbp(...invocation)
    } else if (typeof invocation === 'function') {
      return invocation()
    } else {
      throw new TypeError(`[chelonia/private/invoke] Expected invocation to be an array or a function. Saw ${typeof invocation} instead.`)
    }
  },
  'chelonia/private/queueEvent': function (queueName, invocation) {
    return sbp('okTurtles.eventQueue/queueEvent', queueName, ['chelonia/private/invoke', this._instance, invocation])
  },
  'chelonia/private/verifyManifestSignature': function (contractName: string, manifestHash: string, manifest: Object) {
    // We check that the manifest contains a 'signature' field with the correct
    // shape
    if (!has(manifest, 'signature') || typeof manifest.signature.keyId !== 'string' || typeof manifest.signature.value !== 'string') {
      throw new Error(`Invalid or missing signature field for manifest ${manifestHash} (named ${contractName})`)
    }

    // Now, start the signature verification process
    const rootState = sbp(this.config.stateSelector)
    if (!has(rootState, 'contractSigningKeys')) {
      this.config.reactiveSet(rootState, 'contractSigningKeys', Object.create(null))
    }
    // Because `contractName` comes from potentially unsafe sources (for
    // instance, from `processMessage`), the key isn't used directly because
    // it could overlap with current or future 'special' key names in JavaScript,
    // such as `prototype`, `__proto__`, etc. We also can't guarantee that the
    // `contractSigningKeys` always has a null prototype, and, because of the
    // way we manage state, neither can we use `Map`. So, we use prefix for the
    // lookup key that's unlikely to ever be part of a special JS name.
    const contractNameLookupKey = `name:${contractName}`
    // If the contract name has been seen before, validate its signature now
    let signatureValidated = false
    if (process.env.UNSAFE_TRUST_ALL_MANIFEST_SIGNING_KEYS !== 'true' && has(rootState.contractSigningKeys, contractNameLookupKey)) {
      console.info(`[chelonia] verifying signature for ${manifestHash} with an existing key`)
      if (!has(rootState.contractSigningKeys[contractNameLookupKey], manifest.signature.keyId)) {
        console.error(`The manifest with ${manifestHash} (named ${contractName}) claims to be signed with a key with ID ${manifest.signature.keyId}, which is not trusted. The trusted key IDs for this name are:`, Object.keys(rootState.contractSigningKeys[contractNameLookupKey]))
        throw new Error(`Invalid or missing signature in manifest ${manifestHash} (named ${contractName}). It claims to be signed with a key with ID ${manifest.signature.keyId}, which has not been authorized for this contract before.`)
      }
      const signingKey = rootState.contractSigningKeys[contractNameLookupKey][manifest.signature.keyId]
      verifySignature(signingKey, manifest.body + manifest.head, manifest.signature.value)
      console.info(`[chelonia] successful signature verification for ${manifestHash} (named ${contractName}) using the already-trusted key ${manifest.signature.keyId}.`)
      signatureValidated = true
    }
    // Otherwise, when this is a yet-unseen contract, we parse the body to
    // see its allowed signers to trust on first-use (TOFU)
    const body = JSON.parse(manifest.body)
    // If we don't have a list of authorized signatures yet, verify this
    // contract's signature and set the auhorized signing keys
    if (!signatureValidated) {
      console.info(`[chelonia] verifying signature for ${manifestHash} (named ${contractName}) for the first time`)
      if (!has(body, 'signingKeys') || !Array.isArray(body.signingKeys)) {
        throw new Error(`Invalid manifest file ${manifestHash} (named ${contractName}). Its body doesn't contain a 'signingKeys' list'`)
      }
      let contractSigningKeys: { [idx: string]: string}
      try {
        contractSigningKeys = Object.fromEntries(body.signingKeys.map((serializedKey) => {
          return [
            keyId(serializedKey),
            serializedKey
          ]
        }))
      } catch (e) {
        console.error(`[chelonia] Error parsing the public keys list for ${manifestHash} (named ${contractName})`, e)
        throw e
      }
      if (!has(contractSigningKeys, manifest.signature.keyId)) {
        throw new Error(`Invalid or missing signature in manifest ${manifestHash} (named ${contractName}). It claims to be signed with a key with ID ${manifest.signature.keyId}, which is not listed in its 'signingKeys' field.`)
      }
      verifySignature(contractSigningKeys[manifest.signature.keyId], manifest.body + manifest.head, manifest.signature.value)
      console.info(`[chelonia] successful signature verification for ${manifestHash} (named ${contractName}) using ${manifest.signature.keyId}. The following key IDs will now be trusted for this contract name`, Object.keys(contractSigningKeys))
      signatureValidated = true
      rootState.contractSigningKeys[contractNameLookupKey] = contractSigningKeys
    }

    // If verification was successful, return the parsed body to make the newly-
    // loaded contract available
    return body
  },
  'chelonia/private/loadManifest': async function (contractName: string, manifestHash: string) {
    if (!contractName || typeof contractName !== 'string') {
      throw new Error('Invalid or missing contract name')
    }
    if (this.manifestToContract[manifestHash]) {
      console.warn('[chelonia]: already loaded manifest', manifestHash)
      return
    }
    const manifestSource = await sbp('chelonia/out/fetchResource', manifestHash, { code: multicodes.SHELTER_CONTRACT_MANIFEST })
    const manifest = JSON.parse(manifestSource)
    const body = sbp('chelonia/private/verifyManifestSignature', contractName, manifestHash, manifest)
    if (body.name !== contractName) {
      throw new Error(`Mismatched contract name. Expected ${contractName} but got ${body.name}`)
    }
    const contractInfo = (this.config.contracts.defaults.preferSlim && body.contractSlim) || body.contract
    console.info(`[chelonia] loading contract '${contractInfo.file}'@'${body.version}' from manifest: ${manifestHash}`)
    const source = await sbp('chelonia/out/fetchResource', contractInfo.hash, { code: multicodes.SHELTER_CONTRACT_TEXT })
    function reduceAllow (acc, v) { acc[v] = true; return acc }
    const allowedSels = ['okTurtles.events/on', 'chelonia/defineContract', 'chelonia/out/keyRequest']
      .concat(this.config.contracts.defaults.allowedSelectors)
      .reduce(reduceAllow, {})
    const allowedDoms = this.config.contracts.defaults.allowedDomains
      .reduce(reduceAllow, {})
    const contractSBP = (selector: string, ...args) => {
      const domain = domainFromSelector(selector)
      if (selector.startsWith(contractName + '/')) {
        selector = `${manifestHash}/${selector}`
      }
      if (allowedSels[selector] || allowedDoms[domain]) {
        return sbp(selector, ...args)
      } else {
        console.error('[chelonia] selector not on allowlist', { selector, allowedSels, allowedDoms })
        throw new Error(`[chelonia] selector not on allowlist: '${selector}'`)
      }
    }
    // const saferEval: Function = new FERAL_FUNCTION(`
    // eslint-disable-next-line no-new-func
    const saferEval: Function = new Function(`
      return function (globals) {
        // almost a real sandbox
        // stops (() => this)().fetch
        // needs additional step of locking down Function constructor to stop:
        // new (()=>{}).constructor("console.log(typeof this.fetch)")()
        globals.self = globals
        globals.globalThis = globals
        with (new Proxy(globals, {
          get (o, p) { return o[p] },
          has (o, p) { /* console.log('has', p); */ return true }
        })) {
          (function () {
            'use strict'
            ${source}
          })()
        }
      }
    `)()
    // TODO: lock down Function constructor! could just use SES lockdown()
    // or do our own version of it.
    // https://github.com/endojs/endo/blob/master/packages/ses/src/tame-function-constructors.js
    this.defContractSBP = contractSBP
    this.defContractManifest = manifestHash
    // contracts will also be signed, so even if sandbox breaks we still have protection
    saferEval({
      // pass in globals that we want access to by default in the sandbox
      // note: you can undefine these by setting them to undefined in exposedGlobals
      crypto: {
        // $FlowFixMe
        getRandomValues: (v) => globalThis.crypto.getRandomValues(v)
      },
      ...(typeof window === 'object' && window && {
        alert: window.alert.bind(window),
        confirm: window.confirm.bind(window),
        prompt: window.prompt.bind(window)
      }),
      isNaN,
      console,
      Object,
      Error,
      TypeError,
      RangeError,
      Math,
      Symbol,
      Date,
      Array,
      // $FlowFixMe
      BigInt,
      Boolean,
      Buffer,
      String,
      Number,
      Int8Array,
      Int16Array,
      Int32Array,
      Uint8Array,
      Uint16Array,
      Uint32Array,
      Float32Array,
      Float64Array,
      ArrayBuffer,
      JSON,
      RegExp,
      parseFloat,
      parseInt,
      Promise,
      Function,
      Map,
      WeakMap,
      ...this.config.contracts.defaults.exposedGlobals,
      require: (dep) => {
        return dep === '@sbp/sbp'
          ? contractSBP
          : this.config.contracts.defaults.modules[dep]
      },
      sbp: contractSBP,
      fetchServerTime: async (fallback: ?boolean = true) => {
        // If contracts need the current timestamp (for example, for metadata 'createdDate')
        // they must call this function so that clients are kept synchronized to the server's
        // clock, for consistency, so that if one client's clock is off, it doesn't conflict
        // with other client's clocks.
        // See: https://github.com/okTurtles/group-income/issues/531
        try {
          const response = await this.config.fetch(`${this.config.connectionURL}/time`, { signal: this.abortController.signal })
          return handleFetchResult('text')(response)
        } catch (e) {
          if (fallback) {
            return new Date(sbp('chelonia/time')).toISOString()
          }
          throw new ChelErrorFetchServerTimeFailed('Can not fetch server time. Please check your internet connection.')
        }
      }
    })
    if (contractName !== this.defContract.name) {
      throw new Error(`Invalid contract name for manifest ${manifestHash}. Expected ${contractName} but got ${this.defContract.name}`)
    }
    this.defContractSelectors.forEach(s => { allowedSels[s] = true })
    this.manifestToContract[manifestHash] = {
      slim: contractInfo === body.contractSlim,
      info: contractInfo,
      contract: this.defContract
    }
  },
  // Warning: avoid using this unless you know what you're doing. Prefer using /remove.
  'chelonia/private/removeImmediately': function (contractID: string, params?: { permanent?: boolean, resync?: boolean }) {
    const state = sbp(this.config.stateSelector)
    const contractName = state.contracts[contractID]?.type
    if (!contractName) {
      console.error('[chelonia/private/removeImmediately] Missing contract name for contract', { contractID })
      return
    }

    const manifestHash = this.config.contracts.manifests[contractName]
    if (manifestHash) {
      const destructor = `${manifestHash}/${contractName}/_cleanup`
      // Check if a destructor is defined
      if (sbp('sbp/selectors/fn', destructor)) {
        // And call it
        try {
          sbp(destructor, { contractID, resync: !!params?.resync, state: state[contractID] })
        } catch (e) {
          console.error(`[chelonia/private/removeImmediately] Error at destructor for ${contractID}`, e)
        }
      }
    }

    if (params?.resync) {
      // If re-syncing, keep the reference count
      Object.keys(state.contracts[contractID])
        .filter((k) => k !== 'references')
        .forEach((k) => this.config.reactiveDel(state.contracts[contractID], k))
      // If re-syncing, keep state._volatile.watch
      Object.keys(state[contractID])
        .filter((k) => k !== '_volatile')
        .forEach((k) => this.config.reactiveDel(state[contractID], k))
      if (state[contractID]._volatile) {
        Object.keys(state[contractID]._volatile)
          .filter((k) => k !== 'watch')
          .forEach((k) => this.config.reactiveDel(state[contractID]._volatile, k))
      }
    } else {
      delete this.ephemeralReferenceCount[contractID]
      if (params?.permanent) {
        // Keep a 'null' state to remember permanently-deleted contracts
        // (e.g., when they've been removed from the server)
        this.config.reactiveSet(state.contracts, contractID, null)
      } else {
        this.config.reactiveDel(state.contracts, contractID)
      }
      this.config.reactiveDel(state, contractID)
    }

    this.subscriptionSet.delete(contractID)
    // calling this will make pubsub unsubscribe for events on `contractID`
    sbp('okTurtles.events/emit', CONTRACTS_MODIFIED, Array.from(this.subscriptionSet), {
      added: [],
      removed: [contractID],
      permanent: params?.permanent,
      resync: params?.resync
    })
  },
  // used by, e.g. 'chelonia/contract/wait'
  'chelonia/private/noop': function () {},
  'chelonia/private/out/sync': function (contractIDs: string | string[], params?: { force?: boolean, resync?: boolean }): Promise<*> {
    const listOfIds = typeof contractIDs === 'string' ? [contractIDs] : contractIDs
    const forcedSync = !!params?.force
    return Promise.all(listOfIds.map(contractID => {
      // If this isn't a forced sync and we're already subscribed to the contract,
      // only wait on the event queue (as events should come over the subscription)
      if (!forcedSync && this.subscriptionSet.has(contractID)) {
        const rootState = sbp(this.config.stateSelector)
        // However, if the contract has been marked as dirty (meaning its state
        // could be wrong due to newly received encryption keys), sync it anyhow
        // (i.e., disregard the force flag and proceed to sync the contract)
        if (!rootState[contractID]?._volatile?.dirty) {
          return sbp('chelonia/private/queueEvent', contractID, ['chelonia/private/noop'])
        }
      }
      // enqueue this invocation in a serial queue to ensure
      // handleEvent does not get called on contractID while it's syncing,
      // but after it's finished. This is used in tandem with
      // queuing the 'chelonia/private/in/handleEvent' selector, defined below.
      // This prevents handleEvent getting called with the wrong previousHEAD for an event.
      return sbp('chelonia/private/queueEvent', contractID, [
        'chelonia/private/in/syncContract', contractID, params
      ]).catch((err) => {
        console.error(`[chelonia] failed to sync ${contractID}:`, err)
        throw err // re-throw the error
      })
    }))
  },
  'chelonia/private/out/publishEvent': function (entry: SPMessage, { maxAttempts = 5, headers, billableContractID, bearer } = {}, hooks) {
    const contractID = entry.contractID()
    const originalEntry = entry

    return sbp('chelonia/private/queueEvent', `publish:${contractID}`, async () => {
      let attempt = 1
      let lastAttemptedHeight
      // prepublish is asynchronous to allow for cleanly sending messages to
      // different contracts
      await hooks?.prepublish?.(entry)

      const onreceivedHandler = (contractID: string, message: SPMessage) => {
        if (entry.hash() === message.hash()) {
          sbp('okTurtles.events/off', EVENT_HANDLED, onreceivedHandler)
          hooks.onprocessed(entry)
        }
      }

      if (typeof hooks?.onprocessed === 'function') {
        sbp('okTurtles.events/on', EVENT_HANDLED, onreceivedHandler)
      }

      // auto resend after short random delay
      // https://github.com/okTurtles/group-income/issues/608
      while (true) {
      // Queued event to ensure that we send the event with whatever the
      // 'latest' state may be for that contract (in case we were receiving
      // something over the web socket)
      // This also ensures that the state doesn't change while reading it
        lastAttemptedHeight = entry.height()
        const newEntry = await sbp('chelonia/private/queueEvent', contractID, async () => {
          const rootState = sbp(this.config.stateSelector)
          const state = rootState[contractID]
          const isFirstMessage = entry.isFirstMessage()

          if (!state && !isFirstMessage) {
            console.info(`[chelonia] Not sending message as contract state has been removed: ${entry.description()}`)
            return
          }

          if (hooks?.preSendCheck) {
            if (!await hooks.preSendCheck(entry, state)) {
              console.info(`[chelonia] Not sending message as preSendCheck hook returned non-truish value: ${entry.description()}`)
              return
            }
          }

          // Process message to ensure that it is valid. Should this throw,
          // we propagate the error. Calling `processMessage` will perform
          // validation by checking signatures, well-formedness and, in the case
          // of actions, by also calling both the `validate` method (which
          // doesn't mutate the state) and the `process` method (which could
          // mutate the state).
          // `SPMessage` objects have an implicit `direction` field that's set
          // based on how the object was constructed. For messages that will be
          // sent to the server (this case), `direction` is set to `outgoing`.
          // This `direction` affects how certain errors are reported during
          // processing, and is also exposed to contracts (which could then
          // alter their behavior based on this) to support some features (such
          // as showing users that a certain message is 'pending').
          // Validation ensures that we don't write messages known to be invalid.
          // Although those invalid messages will be ignored if sent anyhow,
          // sending them is wasteful.
          // The only way to know for sure if a message is valid or not is using
          // the same logic that would be used if the message was received,
          // hence the call to `processMessage`. Validation requires having the
          // state and all mutations that would be applied. For example, when
          // joining a chatroom, this is usually done by sending an OP_ATOMIC
          // that contains OP_KEY_ADD and OP_ACTION_ENCRYPTED. Correctly
          // validating this operation requires applying the OP_KEY_ADD to the
          // state in order to know whether OP_ACTION_ENCRYPTED has a valid
          // signature or not.
          // We also rely on this logic to keep different contracts in sync
          // when there are side-effects. For example, the side-effect in a
          // group for someone joining a chatroom can call the `join` action
          // on the chatroom unconditionally, since validation will prevent
          // the message from being sent.
          // Because of this, 'chelonia/private/in/processMessage' SHOULD NOT
          // change the global Chelonia state and it MUST NOT call any
          // side-effects or change the global state in a way that affects
          // the meaning of any future messages or successive invocations.
          // Note: mutations to the contract state, if any, are immediately
          // discarded (see the temporary object created using `cloneDeep`).
          await sbp('chelonia/private/in/processMessage', entry, cloneDeep(state || {}))

          // if this isn't the first event (i.e., OP_CONTRACT), recreate and
          // resend message
          // This is mainly to set height and previousHEAD. For the first event,
          // this doesn't need to be done because previousHEAD is always undefined
          // and height is always 0.
          // We always call recreateEvent because we may have received new events
          // in the web socket
          if (!isFirstMessage) {
            return recreateEvent(entry, state, rootState.contracts[contractID])
          }

          return entry
        })

        // If there is no event to send, return
        if (!newEntry) return

        await hooks?.beforeRequest?.(newEntry, entry)
        entry = newEntry

        const r = await this.config.fetch(`${this.config.connectionURL}/event`, {
          method: 'POST',
          body: entry.serialize(),
          headers: {
            ...headers,
            ...bearer && {
              'Authorization': `Bearer ${bearer}`
            },
            ...billableContractID && {
              'Authorization': buildShelterAuthorizationHeader.call(this, billableContractID)
            },
            'Content-Type': 'text/plain'
          },
          signal: this.abortController.signal
        })
        if (r.ok) {
          await hooks?.postpublish?.(entry)
          return entry
        }
        try {
          if (r.status === 409) {
            if (attempt + 1 > maxAttempts) {
              console.error(`[chelonia] failed to publish ${entry.description()} after ${attempt} attempts`, entry)
              throw new Error(`publishEvent: ${r.status} - ${r.statusText}. attempt ${attempt}`)
            }
            // create new entry
            const randDelay = randomIntFromRange(0, 1500)
            console.warn(`[chelonia] publish attempt ${attempt} of ${maxAttempts} failed. Waiting ${randDelay} msec before resending ${entry.description()}`)
            attempt += 1
            await delay(randDelay) // wait randDelay ms before sending it again

            // TODO: The [pubsub] code seems to miss events that happened between
            // a call to sync and the subscription time. This is a temporary measure
            // to handle this until [pubsub] is updated.
            if (!entry.isFirstMessage() && entry.height() === lastAttemptedHeight) {
              await sbp('chelonia/private/out/sync', contractID, { force: true })
            }
          } else {
            const message = (await r.json())?.message
            console.error(`[chelonia] ERROR: failed to publish ${entry.description()}: ${r.status} - ${r.statusText}: ${message}`, entry)
            throw new Error(`publishEvent: ${r.status} - ${r.statusText}: ${message}`)
          }
        } catch (e) {
          sbp('okTurtles.events/off', EVENT_HANDLED, onreceivedHandler)

          throw e
        }
      }
    }).then((entry) => {
      sbp('okTurtles.events/emit', EVENT_PUBLISHED, { contractID, message: entry, originalMessage: originalEntry })
      return entry
    }).catch((e) => {
      sbp('okTurtles.events/emit', EVENT_PUBLISHING_ERROR, { contractID, message: entry, originalMessage: originalEntry, error: e })
      throw e
    })
  },
  'chelonia/private/out/latestHEADinfo': function (contractID: string) {
    return this.config.fetch(`${this.config.connectionURL}/latestHEADinfo/${contractID}`, {
      cache: 'no-store',
      signal: this.abortController.signal
    }).then(handleFetchResult('json'))
  },
  'chelonia/private/postKeyShare': function (contractID, previousVolatileState, signingKey) {
    const cheloniaState = sbp(this.config.stateSelector)
    const targetState = cheloniaState[contractID]

    if (!targetState) return

    if (previousVolatileState && has(previousVolatileState, 'watch')) {
      if (!targetState._volatile) this.config.reactiveSet(targetState, '_volatile', Object.create(null))
      if (!targetState._volatile.watch) {
        this.config.reactiveSet(targetState._volatile, 'watch', previousVolatileState.watch)
      } else if (targetState._volatile.watch !== previousVolatileState.watch) {
        previousVolatileState.watch.forEach((pWatch) => {
          if (!targetState._volatile.watch.some((tWatch) => {
            return (tWatch[0] === pWatch[0]) && (tWatch[1] === pWatch[1])
          })) {
            targetState._volatile.push(pWatch)
          }
        })
      }
    }

    if (!Array.isArray(targetState._volatile?.pendingKeyRequests)) return

    this.config.reactiveSet(
      targetState._volatile, 'pendingKeyRequests',
      targetState._volatile.pendingKeyRequests.filter((pkr) =>
        pkr?.name !== signingKey.name
      )
    )
  },
  'chelonia/private/in/processMessage': async function (message: SPMessage, state: Object, internalSideEffectStack?: any[], contractName?: string) {
    const [opT, opV] = message.op()
    const hash = message.hash()
    const height = message.height()
    const contractID = message.contractID()
    const manifestHash = message.manifest()
    const signingKeyId = message.signingKeyId()
    const direction = message.direction()
    const config = this.config
    const self = this
    const opName = Object.entries(SPMessage).find(([x, y]) => y === opT)?.[0]
    console.debug('PROCESSING OPCODE:', opName, 'to', contractID)
    if (state?._volatile?.dirty) {
      console.debug('IGNORING OPCODE BECAUSE CONTRACT STATE IS MARKED AS DIRTY.', 'OPCODE:', opName, 'CONTRACT:', contractID)
      return
    }
    if (!state._vm) config.reactiveSet(state, '_vm', Object.create(null))
    const opFns: { [SPOpType]: (any) => void | Promise<void> } = {
      /*
        There are two types of "errors" that we need to consider:
        1. "Ignoring" errors
        2. "Failure" errors
        Example: OP_KEY_ADD
        1. IGNORING: an error is thrown because we wanted to add a key but the key we wanted to add is already there. This is not a hard error, it's an ignoring error. We don't care that the operation failed in this case because the intent was accomplished.
        2. FAILURE: an error is thrown while attempting to add a key that doesn't exist.
        Example: OP_ACTION_ENCRYPTED
        1. IGNORING: An error is thrown because we don't have the key to decrypt the action. We ignore it.
        2. FAILURE: An error is thrown by the process function during processing.
        Handling these in OP_ATOMIC
        • ALL errors of class "IGNORING" should be ignored. They should not impact our ability to process the rest of the operations in the OP_ATOMIC. No matter how many of these are thrown, it doesn't affect the rest of the operations.
        • ANY error of class "FAILURE" will call the rest of the operations to fail and the state to be reverted to prior to the OP_ATOMIC. No side-effects should be run. Because an intention failed.
      */
      async [SPMessage.OP_ATOMIC] (v: SPOpAtomic) {
        for (let i = 0; i < v.length; i++) {
          const u = v[i]
          try {
            if (u[0] === SPMessage.OP_ATOMIC) throw new Error('Cannot nest OP_ATOMIC')
            if (!validateKeyPermissions(message, config, state, signingKeyId, u[0], u[1])) {
              throw new Error('Inside OP_ATOMIC: no matching signing key was defined')
            }
            await opFns[u[0]](u[1])
          } catch (e) {
            if (e && typeof e === 'object') {
              if (e.name === 'ChelErrorDecryptionKeyNotFound') {
                console.warn(`[chelonia] [OP_ATOMIC] WARN '${e.name}' in processMessage for ${message.description()}: ${e.message}`, e, message.serialize())
                if (e.cause) {
                  const missingDecryptionKeyIds = missingDecryptionKeyIdsMap.get(message)
                  if (missingDecryptionKeyIds) {
                    missingDecryptionKeyIds.add(e.cause)
                  } else {
                    missingDecryptionKeyIdsMap.set(message, new Set([e.cause]))
                  }
                }
                continue
              } else {
                logEvtError(message, `[chelonia] [OP_ATOMIC] ERROR '${e.name}' in processMessage for ${message.description()}: ${e.message || e}`, e, message.serialize())
              }
              console.warn(`[chelonia] [OP_ATOMIC] Error processing ${message.description()}: ${message.serialize()}. Any side effects will be skipped!`)
              if (config.strictProcessing) {
                throw e
              }
              config.hooks.processError?.(e, message, getMsgMeta(message, contractID, state))
              if (e.name === 'ChelErrorWarning') continue
            } else {
              logEvtError(message, 'Inside OP_ATOMIC: Non-object or null error thrown', contractID, message, i, e)
            }
            throw e
          }
        }
      },
      [SPMessage.OP_CONTRACT] (v: SPOpContract) {
        state._vm.type = v.type
        const keys = keysToMap(v.keys, height)
        config.reactiveSet(state._vm, 'authorizedKeys', keys)
        // Loop through the keys in the contract and try to decrypt all of the private keys
        // Example: in the identity contract you have the IEK, IPK, CSK, and CEK.
        // When you login you have the IEK which is derived from your password, and you
        // will use it to decrypt the rest of the keys which are encrypted with that.
        // Specifically, the IEK is used to decrypt the CSKs and the CEKs, which are
        // the encrypted versions of the CSK and CEK.
        keyAdditionProcessor.call(self, message, hash, v.keys, state, contractID, signingKey, internalSideEffectStack)
      },
      [SPMessage.OP_ACTION_ENCRYPTED] (v: SPOpActionEncrypted) {
        if (config.skipActionProcessing) {
          if (process.env.BUILD === 'web') {
            console.log('OP_ACTION_ENCRYPTED: skipped action processing')
          }
          return
        }
        return opFns[SPMessage.OP_ACTION_UNENCRYPTED](v.valueOf())
      },
      async [SPMessage.OP_ACTION_UNENCRYPTED] (v: SPOpActionUnencrypted) {
        if (!config.skipActionProcessing) {
          let innerSigningKeyId: string | typeof undefined
          if (isSignedData(v)) {
            innerSigningKeyId = (v: any).signingKeyId
            v = (v: any).valueOf()
          }

          const { data, meta, action } = (v: any)

          if (!config.whitelisted(action)) {
            throw new Error(`chelonia: action not whitelisted: '${action}'`)
          }

          await sbp(
            `${manifestHash}/${action}/process`,
            {
              data,
              meta,
              hash,
              height,
              contractID,
              direction: message.direction(),
              signingKeyId,
              get signingContractID () {
                return getContractIDfromKeyId(contractID, signingKeyId, state)
              },
              innerSigningKeyId,
              get innerSigningContractID () {
                return getContractIDfromKeyId(contractID, innerSigningKeyId, state)
              }
            },
            state
          )
        }
      },
      [SPMessage.OP_KEY_SHARE] (wv: SPOpKeyShare) {
        // TODO: Prompt to user if contract not in pending

        const data = unwrapMaybeEncryptedData(wv)
        if (!data) return
        const v = (data.data: ProtoSPOpKeyShare)

        for (const key of v.keys) {
          if (key.id && key.meta?.private?.content) {
            if (!has(state._vm, 'sharedKeyIds')) self.config.reactiveSet(state._vm, 'sharedKeyIds', [])
            if (!state._vm.sharedKeyIds.some((sK) => sK.id === key.id)) state._vm.sharedKeyIds.push({ id: key.id, contractID: v.contractID, height, keyRequestHash: v.keyRequestHash, keyRequestHeight: v.keyRequestHeight })
          }
        }

        // If this is a response to an OP_KEY_REQUEST (marked by the
        // presence of the keyRequestHash attribute), then we'll mark the
        // key request as completed
        // TODO: Verify that the keyRequestHash is what we expect (on the
        // other contact's state, we should have a matching structure in
        // state._volatile.pendingKeyRequests = [
        //    { contractID: "this", name: "name of this signingKeyId", reference: "this reference", hash: "KA" }, ..., but we don't
        // have a copy of the keyRequestHash (this would need a new
        // message to ourselves in the KR process), so for now we trust
        // that if it has keyRequestHash, it's a response to a request
        // we sent.
        // For similar reasons, we can't check pendingKeyRequests, because
        // depending on how and in which order events are processed, it may
        // not be available.
        // ]
        if (has(v, 'keyRequestHash') && state._vm.authorizedKeys[signingKeyId].meta?.keyRequest) {
          self.config.reactiveSet(state._vm.authorizedKeys[signingKeyId].meta.keyRequest, 'responded', hash)
        }

        internalSideEffectStack?.push(async () => {
          delete self.postSyncOperations[contractID]?.['pending-keys-for-' + v.contractID]

          const cheloniaState = sbp(self.config.stateSelector)

          const targetState = cheloniaState[v.contractID]
          const missingDecryptionKeyIds = cheloniaState.contracts[v.contractID]?.missingDecryptionKeyIds

          let newestEncryptionKeyHeight = Number.POSITIVE_INFINITY
          for (const key of v.keys) {
            if (key.id && key.meta?.private?.content) {
              // Outgoing messages' keys are always transient
              const transient = direction === 'outgoing' || key.meta.private.transient
              if (
                !sbp('chelonia/haveSecretKey', key.id, !transient)
              ) {
                try {
                  const decrypted = key.meta.private.content.valueOf()
                  sbp('chelonia/storeSecretKeys', new Secret([{
                    key: deserializeKey(decrypted),
                    transient
                  }]))
                  // If we've just received a known missing key (i.e., a key
                  // that previously resulted in a decryption error), we know
                  // our state is outdated and we need to re-sync the contract
                  if (missingDecryptionKeyIds?.includes(key.id)) {
                    newestEncryptionKeyHeight = Number.NEGATIVE_INFINITY
                  } else if (
                  // Otherwise, we make an educated guess on whether a re-sync
                  // is needed based on the height.
                    targetState?._vm?.authorizedKeys?.[key.id]?._notBeforeHeight != null &&
                      Array.isArray(targetState._vm.authorizedKeys[key.id].purpose) &&
                      targetState._vm.authorizedKeys[key.id].purpose.includes('enc')
                  ) {
                    newestEncryptionKeyHeight = Math.min(newestEncryptionKeyHeight, targetState._vm.authorizedKeys[key.id]._notBeforeHeight)
                  }
                } catch (e) {
                  if (e?.name === 'ChelErrorDecryptionKeyNotFound') {
                    console.warn(`OP_KEY_SHARE (${hash} of ${contractID}) missing secret key: ${e.message}`,
                      e)
                  } else {
                    // Using console.error instead of logEvtError because this
                    // is a side-effect and not relevant for outgoing messages
                    console.error(`OP_KEY_SHARE (${hash} of ${contractID}) error '${e.message || e}':`,
                      e)
                  }
                }
              }
            }
          }

          // If an encryption key has been shared with _notBefore lower than the
          // current height, then the contract must be resynced.
          const mustResync = !!(newestEncryptionKeyHeight < cheloniaState.contracts[v.contractID]?.height)

          if (mustResync) {
            if (!has(targetState, '_volatile')) config.reactiveSet(targetState, '_volatile', Object.create(null))
            config.reactiveSet(targetState._volatile, 'dirty', true)

            if (!Object.keys(targetState).some((k) => k !== '_volatile')) {
              // If the contract only has _volatile state, we don't force sync it
              return
            }

            // Mark contracts that have foreign keys that have been received
            // as dirty
            // First, we group watched keys by key and contracts
            const keyDict = Object.create(null)
            targetState._volatile?.watch?.forEach(([keyName, contractID]) => {
              if (!keyDict[keyName]) {
                keyDict[keyName] = [contractID]
                return
              }
              keyDict[keyName].push(contractID)
            })
            // Then, see which of those contracts need to be updated
            // $FlowFixMe[incompatible-call]
            const contractIdsToUpdate = Array.from(new Set(Object.entries(keyDict).flatMap(([keyName, contractIDs]) => {
              const keyId = findKeyIdByName(targetState, keyName)
              if (
                // Does the key exist? (i.e., is it a current key)
                keyId &&
                // Is it an encryption key? (signing keys don't build up a
                // potentially invalid state because the private key isn't
                // required for validation; however, missing encryption keys
                // prevent message processing)
                targetState._vm.authorizedKeys[keyId].purpose.includes('enc') &&
                // Is this a newly set key? (avoid re-syncing contracts that
                // haven't been affected by the `OP_KEY_SHARE`)
                targetState._vm.authorizedKeys[keyId]._notBeforeHeight >= newestEncryptionKeyHeight
              ) {
                return contractIDs
              }
              return []
            })))
            // Mark these contracts as dirty
            contractIdsToUpdate.forEach((contractID) => {
              const targetState = cheloniaState[contractID]
              if (!targetState) return
              if (!has(targetState, '_volatile')) config.reactiveSet(targetState, '_volatile', Object.create(null))
              config.reactiveSet(targetState._volatile, 'dirty', true)
            })

            // Since we have received new keys, the current contract state might be wrong, so we need to remove the contract and resync
            // Note: The following may be problematic when several tabs are open
            // sharing the same state. This is more of a general issue in this
            // situation, not limited to the following sequence of events
            if (self.subscriptionSet.has(v.contractID)) {
              const resync = sbp('chelonia/private/queueEvent', v.contractID, [
                'chelonia/private/in/syncContract', v.contractID
              ]).then(() => {
                // Now, if we're subscribed to any of the contracts that were
                // marked as dirty, re-sync them
                sbp('chelonia/private/out/sync',
                  contractIdsToUpdate.filter((contractID) => {
                    return self.subscriptionSet.has(contractID)
                  }),
                  { force: true, resync: true }
                ).catch(e => {
                  // Using console.error instead of logEvtError because this
                  // is a side-effect and not relevant for outgoing messages
                  console.error('[chelonia] Error resyncing contracts with foreign key references after key rotation', e)
                })
              }).catch((e) => {
                // Using console.error instead of logEvtError because this
                // is a side-effect and not relevant for outgoing messages
                console.error(`[chelonia] Error during sync for ${v.contractID} during OP_KEY_SHARE for ${contractID}`)
                if (v.contractID === contractID) {
                  throw e
                }
              })

              // If the keys received were for the current contract, we can't
              // use queueEvent as we're already on that same queue
              if (v.contractID !== contractID) {
                await resync
              }
            }
          }

          const previousVolatileState = targetState?._volatile
          sbp('chelonia/private/queueEvent', v.contractID, ['chelonia/private/postKeyShare', v.contractID, mustResync ? previousVolatileState : null, signingKey])
            .then(() => {
            // The CONTRACT_HAS_RECEIVED_KEYS event is placed on the queue for
            // the current contract so that calling
            // 'chelonia/contract/waitingForKeyShareTo' will give correct results
            // (i.e., the event is processed after the state is written)
              sbp('chelonia/private/queueEvent', contractID, () => {
                sbp('okTurtles.events/emit', CONTRACT_HAS_RECEIVED_KEYS, { contractID: v.contractID, sharedWithContractID: contractID, signingKeyId, get signingKeyName () { return state._vm?.authorizedKeys?.[signingKeyId]?.name } })
              }).catch(e => {
                // Using console.error instead of logEvtError because this
                // is a side-effect and not relevant for outgoing messages
                console.error(`[chelonia] Error while emitting the CONTRACT_HAS_RECEIVED_KEYS event for ${contractID}`, e)
              })
            })
        })
      },
      [SPMessage.OP_KEY_REQUEST] (wv: SPOpKeyRequest) {
        const data = unwrapMaybeEncryptedData(wv)

        // If we're unable to decrypt the OP_KEY_REQUEST, then still
        // proceed to do accounting of invites
        const v = data?.data || { contractID: '(private)', replyWith: { context: undefined }, request: '*' }

        const originatingContractID = v.contractID

        if (state._vm?.invites?.[signingKeyId]?.quantity != null) {
          if (state._vm.invites[signingKeyId].quantity > 0) {
            if ((--state._vm.invites[signingKeyId].quantity) <= 0) {
              state._vm.invites[signingKeyId].status = INVITE_STATUS.USED
            }
          } else {
            logEvtError(message, 'Ignoring OP_KEY_REQUEST because it exceeds allowed quantity: ' + originatingContractID)
            return
          }
        }

        if (state._vm?.invites?.[signingKeyId]?.expires != null) {
          if (state._vm.invites[signingKeyId].expires < Date.now()) {
            logEvtError(message, 'Ignoring OP_KEY_REQUEST because it expired at ' + state._vm.invites[signingKeyId].expires + ': ' + originatingContractID)
            return
          }
        }

        // If skipping porocessing or if the message is outgoing, there isn't
        // anything else to do
        if (config.skipActionProcessing || direction === 'outgoing') {
          return
        }

        // Outgoing messages don't have a context attribute
        if (!has(v.replyWith, 'context')) {
          logEvtError(message, 'Ignoring OP_KEY_REQUEST because it is missing the context attribute')
          return
        }

        const context = v.replyWith.context

        if (data && (!Array.isArray(context) || (context: any)[0] !== originatingContractID)) {
          logEvtError(message, 'Ignoring OP_KEY_REQUEST because it is signed by the wrong contract')
          return
        }

        if (v.request !== '*') {
          logEvtError(message, 'Ignoring OP_KEY_REQUEST because it has an unsupported request attribute', v.request)
          return
        }

        if (!state._vm.pendingKeyshares) config.reactiveSet(state._vm, 'pendingKeyshares', Object.create(null))

        config.reactiveSet(state._vm.pendingKeyshares, message.hash(), [
          // Full-encryption (i.e., KRS encryption) requires that this request
          // was encrypted and that the invite is marked as private
          !!data?.encryptionKeyId,
          message.height(),
          signingKeyId,
          ...(context ? [context] : [])
        ])

        // Call 'chelonia/private/respondToAllKeyRequests' after sync
        if (data) {
          internalSideEffectStack?.push(() => {
            self.setPostSyncOp(contractID, 'respondToAllKeyRequests-' + message.contractID(), ['chelonia/private/respondToAllKeyRequests', contractID])
          })
        }
      },
      [SPMessage.OP_KEY_REQUEST_SEEN] (wv: SPOpKeyRequestSeen) {
        if (config.skipActionProcessing) {
          return
        }
        // TODO: Handle boolean (success) value

        const data = unwrapMaybeEncryptedData(wv)
        if (!data) return
        const v = (data.data: ProtoSPOpKeyRequestSeen)

        if (state._vm.pendingKeyshares && v.keyRequestHash in state._vm.pendingKeyshares) {
          const hash = v.keyRequestHash
          const pending = state._vm.pendingKeyshares[hash]
          delete state._vm.pendingKeyshares[hash]
          if (pending.length !== 4) return

          // If we were able to respond, clean up responders
          const keyId = pending[2]
          const originatingContractID = pending[3][0]
          if (Array.isArray(state._vm?.invites?.[keyId]?.responses)) {
            state._vm?.invites?.[keyId]?.responses.push(originatingContractID)
          }

          if (!has(state._vm, 'keyshares')) self.config.reactiveSet(state._vm, 'keyshares', Object.create(null))

          const success = v.success

          self.config.reactiveSet(state._vm.keyshares, hash, {
            contractID: originatingContractID,
            height,
            success,
            ...(success && {
              hash: v.keyShareHash
            })
          })
        }
      },
      [SPMessage.OP_PROP_DEL]: notImplemented,
      [SPMessage.OP_PROP_SET] (v: SPOpPropSet) {
        if (!state._vm.props) state._vm.props = {}
        state._vm.props[v.key] = v.value
      },
      [SPMessage.OP_KEY_ADD] (v: SPOpKeyAdd) {
        const keys = keysToMap(v, height, state._vm.authorizedKeys)
        const keysArray = ((Object.values(v): any): SPKey[])
        keysArray.forEach((k) => {
          if (has(state._vm.authorizedKeys, k.id) && state._vm.authorizedKeys[k.id]._notAfterHeight == null) {
            throw new ChelErrorWarning('Cannot use OP_KEY_ADD on existing keys. Key ID: ' + k.id)
          }
        })
        validateKeyAddPermissions(contractID, signingKey, state, v)
        config.reactiveSet(state._vm, 'authorizedKeys', { ...state._vm.authorizedKeys, ...keys })
        keyAdditionProcessor.call(self, message, hash, v, state, contractID, signingKey, internalSideEffectStack)
      },
      [SPMessage.OP_KEY_DEL] (v: SPOpKeyDel) {
        if (!state._vm.authorizedKeys) config.reactiveSet(state._vm, 'authorizedKeys', Object.create(null))
        if (!state._volatile) config.reactiveSet(state, '_volatile', Object.create(null))
        if (!state._volatile.pendingKeyRevocations) config.reactiveSet(state._volatile, 'pendingKeyRevocations', Object.create(null))
        validateKeyDelPermissions(contractID, signingKey, state, v)
        const keyIds = ((v.map((k) => {
          const data = unwrapMaybeEncryptedData(k)
          if (!data) return undefined
          return data.data
        }): any): string[]).filter((keyId) => {
          if (!keyId || typeof keyId !== 'string') return false
          if (!has(state._vm.authorizedKeys, (keyId: any)) || state._vm.authorizedKeys[keyId]._notAfterHeight != null) {
            console.warn('Attempted to delete non-existent key from contract', { contractID, keyId })
            return false
          }
          return true
        })

        keyIds.forEach((keyId) => {
          const key = state._vm.authorizedKeys[keyId]
          state._vm.authorizedKeys[keyId]._notAfterHeight = height

          if (has(state._volatile.pendingKeyRevocations, keyId)) {
            delete state._volatile.pendingKeyRevocations[keyId]
          }

          // Are we deleting a foreign key? If so, we also need to remove
          // the operation from (1) _volatile.watch (on the other contract)
          // and (2) pendingWatch
          if (key.foreignKey) {
            const fkUrl = new URL(key.foreignKey)
            const foreignContract = fkUrl.pathname
            const foreignKeyName = fkUrl.searchParams.get('keyName')

            if (!foreignContract || !foreignKeyName) throw new Error('Invalid foreign key: missing contract or key name')

            internalSideEffectStack?.push(() => {
              sbp('chelonia/private/queueEvent', foreignContract, () => {
                const rootState = sbp(config.stateSelector)
                if (Array.isArray(rootState[foreignContract]?._volatile?.watch)) {
                  // Stop watching events for this key
                  const oldWatch = rootState[foreignContract]._volatile.watch
                  rootState[foreignContract]._volatile.watch = oldWatch.filter(([name, cID]) => name !== foreignKeyName || cID !== contractID)
                  if (oldWatch.length !== rootState[foreignContract]._volatile.watch.length) {
                    // If the number of foreign keys changed, maybe there's no
                    // reason to remain subscribed to this contract. In this
                    // case, attempt to release it.
                    sbp('chelonia/contract/release', foreignContract, { try: true }).catch(e => {
                      // Using console.error instead of logEvtError because this
                      // is a side-effect and not relevant for outgoing messages
                      console.error(`[chelonia] Error at OP_KEY_DEL internalSideEffectStack while attempting to release foreign contract ${foreignContract}`, e)
                    })
                  }
                }
              }).catch((e) => {
                // Using console.error instead of logEvtError because this
                // is a side-effect and not relevant for outgoing messages
                console.error('Error stopping watching events after removing key', { contractID, foreignContract, foreignKeyName, fkUrl })
              })
            })

            const pendingWatch = state._vm.pendingWatch?.[foreignContract]
            if (pendingWatch) {
              config.reactiveSet(state._vm.pendingWatch, foreignContract, pendingWatch.filter(([, kId]) => kId !== keyId))
            }
          }

          // Set the status to revoked for invite keys
          if (key.name.startsWith('#inviteKey-') && state._vm.invites[key.id]) {
            state._vm.invites[key.id].status = INVITE_STATUS.REVOKED
          }
        })

        // Check state._volatile.watch for contracts that should be
        // mirroring this operation
        if (Array.isArray(state._volatile?.watch)) {
          const updatedKeysMap = Object.create(null)

          keyIds.forEach((keyId) => {
            updatedKeysMap[state._vm.authorizedKeys[keyId].name] = {
              name: state._vm.authorizedKeys[keyId].name,
              oldKeyId: keyId
            }
          })

          keyRotationHelper(contractID, state, config, updatedKeysMap, [SPMessage.OP_KEY_DEL], 'chelonia/out/keyDel', (name) => updatedKeysMap[name[0]].oldKeyId, internalSideEffectStack)
        }
      },
      [SPMessage.OP_KEY_UPDATE] (v: SPOpKeyUpdate) {
        if (!state._volatile) config.reactiveSet(state, '_volatile', Object.create(null))
        if (!state._volatile.pendingKeyRevocations) config.reactiveSet(state._volatile, 'pendingKeyRevocations', Object.create(null))
        const [updatedKeys, updatedMap] = validateKeyUpdatePermissions(contractID, signingKey, state, v)
        const keysToDelete = ((Object.values(updatedMap): any): string[])
        for (const keyId of keysToDelete) {
          if (has(state._volatile.pendingKeyRevocations, keyId)) {
            delete state._volatile.pendingKeyRevocations[keyId]
          }

          config.reactiveSet(state._vm.authorizedKeys[keyId], '_notAfterHeight', height)
        }
        for (const key of updatedKeys) {
          if (!has(state._vm.authorizedKeys, key.id)) {
            key._notBeforeHeight = height
            config.reactiveSet(state._vm.authorizedKeys, key.id, cloneDeep(key))
          }
        }
        keyAdditionProcessor.call(self, message, hash, (updatedKeys: any), state, contractID, signingKey, internalSideEffectStack)

        // Check state._volatile.watch for contracts that should be
        // mirroring this operation
        if (Array.isArray(state._volatile?.watch)) {
          const updatedKeysMap = Object.create(null)

          updatedKeys.forEach((key) => {
            if (key.data) {
              updatedKeysMap[key.name] = key
              updatedKeysMap[key.name].oldKeyId = updatedMap[key.id]
            }
          })

          keyRotationHelper(contractID, state, config, updatedKeysMap, [SPMessage.OP_KEY_UPDATE], 'chelonia/out/keyUpdate', (name) => ({
            name: name[1],
            oldKeyId: updatedKeysMap[name[0]].oldKeyId,
            id: updatedKeysMap[name[0]].id,
            data: updatedKeysMap[name[0]].data
          }), internalSideEffectStack)
        }
      },
      [SPMessage.OP_PROTOCOL_UPGRADE]: notImplemented
    }
    if (!this.config.skipActionProcessing && !this.manifestToContract[manifestHash]) {
      const rootState = sbp(this.config.stateSelector)
      // Having rootState.contracts[contractID] is not enough to determine we
      // have previously synced this contract, as reference counts are also
      // stored there. Hence, we check for the presence of 'type'
      if (!contractName) {
        contractName = has(rootState.contracts, contractID) && rootState.contracts[contractID] && has(rootState.contracts[contractID], 'type')
          ? rootState.contracts[contractID].type
          : opT === SPMessage.OP_CONTRACT
            ? ((opV: any): SPOpContract).type
            : ''
      }
      if (!contractName) {
        throw new Error(`Unable to determine the name for a contract and refusing to load it (contract ID was ${contractID} and its manifest hash was ${manifestHash})`)
      }
      await sbp('chelonia/private/loadManifest', contractName, manifestHash)
    }
    let processOp = true
    if (config.preOp) {
      processOp = config.preOp(message, state) !== false && processOp
    }

    let signingKey: SPKey
    // Signature verification
    {
      // This sync code has potential issues
      // The first issue is that it can deadlock if there are circular references
      // The second issue is that it doesn't handle key rotation. If the key used for signing is invalidated / removed from the originating contract, we won't have it in the state
      // Both of these issues can be resolved by introducing a parameter with the message ID the state is based on. This requires implementing a separate, ephemeral, state container for operations that refer to a different contract.
      // The difficulty of this is how to securely determine the message ID to use.
      // The server can assist with this.

      const stateForValidation = opT === SPMessage.OP_CONTRACT && !state?._vm?.authorizedKeys
        ? {
            _vm: {
              authorizedKeys: keysToMap(((opV: any): SPOpContract).keys, height)
            }
          }
        : state

      // Verify that the signing key is found, has the correct purpose and is
      // allowed to sign this particular operation
      if (!validateKeyPermissions(message, config, stateForValidation, signingKeyId, opT, opV)) {
        throw new Error('No matching signing key was defined')
      }

      signingKey = stateForValidation._vm.authorizedKeys[signingKeyId]
    }

    if (config[`preOp_${opT}`]) {
      processOp = config[`preOp_${opT}`](message, state) !== false && processOp
    }
    if (processOp) {
      await opFns[opT](opV)
      config.postOp?.(message, state)
      config[`postOp_${opT}`]?.(message, state) // hack to fix syntax highlighting `
    }
  },
  'chelonia/private/in/enqueueHandleEvent': function (contractID: string, event: string) {
    // make sure handleEvent is called AFTER any currently-running invocations
    // to 'chelonia/private/out/sync', to prevent gi.db from throwing
    // "bad previousHEAD" errors
    return sbp('chelonia/private/queueEvent', contractID, async () => {
      await sbp('chelonia/private/in/handleEvent', contractID, event)
      // Before the next operation is enqueued, enqueue post sync ops. This
      // makes calling `/wait` more reliable
      sbp('chelonia/private/enqueuePostSyncOps', contractID)
    })
  },
  'chelonia/private/in/syncContract': async function (contractID: string, params?: { force?: boolean, resync?: boolean }) {
    const state = sbp(this.config.stateSelector)
    if (state.contracts[contractID] === null) {
      throw new ChelErrorResourceGone('Cannot sync permanently deleted contract ' + contractID)
    }

    try {
      this.currentSyncs[contractID] = { firstSync: !state.contracts[contractID]?.type }
      sbp('okTurtles.events/emit', CONTRACT_IS_SYNCING, contractID, true)
      const currentVolatileState = state[contractID]?._volatile || Object.create(null)
      // If the dirty flag is set (indicating that new encryption keys were received),
      // we remove the current state before syncing (this has the effect of syncing
      // from the beginning, recreating the entire state). When this is the case,
      // the _volatile state is preserved
      if (currentVolatileState?.dirty || params?.resync) {
        delete currentVolatileState.dirty
        currentVolatileState.resyncing = true
        sbp('chelonia/private/removeImmediately', contractID, { resync: true })
        this.config.reactiveSet(state, contractID, Object.create(null))
        this.config.reactiveSet(state[contractID], '_volatile', currentVolatileState)
      }

      const { HEAD: latestHEAD } = await sbp('chelonia/out/latestHEADInfo', contractID)
      console.debug(`[chelonia] syncContract: ${contractID} latestHash is: ${latestHEAD}`)
      // there is a chance two users are logged in to the same machine and must check their contracts before syncing
      const { HEAD: recentHEAD, height: recentHeight } = state.contracts[contractID] || {}
      const isSubscribed = this.subscriptionSet.has(contractID)
      if (!isSubscribed) {
        const entry = this.pending.find((entry) => entry?.contractID === contractID)
        // we're syncing a contract for the first time, make sure to add to pending
        // so that handleEvents knows to expect events from this contract
        if (!entry) {
          this.pending.push({ contractID })
        }
      }
      this.postSyncOperations[contractID] = this.postSyncOperations[contractID] ?? Object.create(null)

      if (latestHEAD !== recentHEAD) {
        console.debug(`[chelonia] Synchronizing Contract ${contractID}: our recent was ${recentHEAD || 'undefined'} but the latest is ${latestHEAD}`)
        // TODO: fetch events from localStorage instead of server if we have them
        const eventsStream = sbp('chelonia/out/eventsAfter', contractID, recentHeight ?? 0, undefined, recentHEAD ?? contractID)
        // Sanity check: verify event with latest hash exists in list of events
        // TODO: using findLastIndex, it will be more clean but it needs Cypress 9.7+ which has bad performance
        //       https://docs.cypress.io/guides/references/changelog#9-7-0
        //       https://github.com/cypress-io/cypress/issues/22868
        let latestHashFound = false
        const eventReader = eventsStream.getReader()
        // remove the first element in cases where we are not getting the contract for the first time
        for (let skip = has(state.contracts, contractID) && has(state.contracts[contractID], 'HEAD'); ; skip = false) {
          const { done, value: event } = await eventReader.read()
          if (done) {
            if (!latestHashFound) {
              throw new ChelErrorForkedChain(`expected hash ${latestHEAD} in list of events for contract ${contractID}`)
            }
            break
          }
          if (!latestHashFound) {
            latestHashFound = SPMessage.deserializeHEAD(event).hash === latestHEAD
          }
          if (skip) continue
          // this must be called directly, instead of via enqueueHandleEvent
          await sbp('chelonia/private/in/handleEvent', contractID, event)
        }
      } else if (!isSubscribed) {
        this.subscriptionSet.add(contractID)
        sbp('okTurtles.events/emit', CONTRACTS_MODIFIED, Array.from(this.subscriptionSet), { added: [contractID], removed: [] })
        const entryIndex = this.pending.findIndex((entry) => entry?.contractID === contractID)
        if (entryIndex !== -1) {
          this.pending.splice(entryIndex, 1)
        }
        console.debug(`[chelonia] added already synchronized ${contractID} to subscription set`)
      } else {
        console.debug(`[chelonia] contract ${contractID} was already synchronized`)
      }

      // Do not await here as the post-sync ops might themselves might be
      // waiting on the same queue, causing a deadlock
      sbp('chelonia/private/enqueuePostSyncOps', contractID)
    } catch (e) {
      console.error(`[chelonia] syncContract error: ${e.message || e}`, e)
      this.config.hooks.syncContractError?.(e, contractID)
      throw e
    } finally {
      if (state[contractID]?._volatile?.resyncing) {
        this.config.reactiveDel(state[contractID]._volatile, 'resyncing')
      }
      delete this.currentSyncs[contractID]
      sbp('okTurtles.events/emit', CONTRACT_IS_SYNCING, contractID, false)
    }
  },
  'chelonia/private/enqueuePostSyncOps': function (contractID: string) {
    if (!has(this.postSyncOperations, contractID)) return

    // Iterate over each post-sync operation associated with the given contractID.
    Object.entries(this.postSyncOperations[contractID]).forEach(([key, op]) => {
      // Remove the operation which is about to be handled so that subsequent
      // calls to this selector don't result in repeat calls to the post-sync op
      delete this.postSyncOperations[contractID][key]

      // Queue the current operation for execution.
      // Note that we do _not_ await because it could be unsafe to do so.
      // If the operation fails for some reason, just log the error.
      sbp('chelonia/private/queueEvent', contractID, op).catch((e) => {
        console.error(`Post-sync operation for ${contractID} failed`, { contractID, op, error: e })
      })
    })
  },
  'chelonia/private/watchForeignKeys': function (externalContractID: string) {
    const state = sbp(this.config.stateSelector)
    const externalContractState = state[externalContractID]

    const pendingWatch = externalContractState?._vm?.pendingWatch

    if (!pendingWatch || !Object.keys(pendingWatch).length) return

    const signingKey = findSuitableSecretKeyId(externalContractState, [SPMessage.OP_KEY_DEL], ['sig'])
    const canMirrorOperations = !!signingKey

    // Only sync contract if we are actually able to mirror key operations
    // This avoids exponentially growing the number of contracts that we need
    // to be subscribed to.
    // Otherwise, every time there is a foreign key, we would subscribe to that
    // contract, plus the contracts referenced by the foreign keys of that
    // contract, plus those contracts referenced by the foreign keys of those
    // other contracts and so on.
    if (!canMirrorOperations) {
      console.info('[chelonia/private/watchForeignKeys]: Returning as operations cannot be mirrored', { externalContractID })
      return
    }

    // For each pending watch operation, queue a synchronization event in the
    // respective contract queue
    Object.entries(pendingWatch).forEach(([contractID, keys]) => {
      if (
        !Array.isArray(keys) ||
        // Check that the keys exist and haven't been revoked
        // $FlowFixMe[incompatible-use]
        !keys.reduce((acc, [, id]) => {
          return acc || has(externalContractState._vm.authorizedKeys, id)
        }, false)
      ) {
        console.info('[chelonia/private/watchForeignKeys]: Skipping as none of the keys to watch exist', {
          externalContractID,
          contractID
        })
        return
      }

      sbp('chelonia/private/queueEvent', contractID, ['chelonia/private/in/syncContractAndWatchKeys', contractID, externalContractID]).catch((e) => {
        console.error(`Error at syncContractAndWatchKeys for contractID ${contractID} and externalContractID ${externalContractID}`, e)
      })
    })
  },
  'chelonia/private/in/syncContractAndWatchKeys': async function (contractID: string, externalContractID: string) {
    const rootState = sbp(this.config.stateSelector)
    const externalContractState = rootState[externalContractID]
    const pendingWatch = externalContractState?._vm?.pendingWatch?.[contractID]?.splice(0)

    // We duplicate the check in 'chelonia/private/watchForeignKeys' because
    // new events may have been received in the meantime. This avoids
    // unnecessarily subscribing to the contract
    if (
      !Array.isArray(pendingWatch) ||
      // Check that the keys exist and haven't been revoked
      !pendingWatch.reduce((acc, [, id]) => {
        return acc || (
          has(externalContractState._vm.authorizedKeys, id) &&
          findKeyIdByName(externalContractState, externalContractState._vm.authorizedKeys[id].name) != null
        )
      }, false)
    ) {
      console.info('[chelonia/private/syncContractAndWatchKeys]: Skipping as none of the keys to watch exist', {
        externalContractID,
        contractID
      })
      return
    }

    // We check this.subscriptionSet to see if we're already
    // subscribed to the contract; if not, we call sync.
    if (!this.subscriptionSet.has(contractID)) {
      await sbp('chelonia/private/in/syncContract', contractID)
    }

    const contractState = rootState[contractID]
    const keysToDelete = []
    const keysToUpdate = []

    pendingWatch.forEach(([keyName, externalId]) => {
    // Does the key exist? If not, it has probably been removed and instead
    // of waiting, we need to remove it ourselves
      const keyId = findKeyIdByName(contractState, keyName)
      if (!keyId) {
        keysToDelete.push(externalId)
        return
      } else if (keyId !== externalId) {
      // Or, the key has been updated and we need to update it in the external
      // contract as well
        keysToUpdate.push(externalId)
      }

      // Add keys to watchlist as another contract is waiting on these
      // operations
      if (!contractState._volatile) {
        this.config.reactiveSet(contractState, '_volatile', Object.create(null, { watch: { value: [[keyName, externalContractID]], configurable: true, enumerable: true, writable: true } }))
      } else {
        if (!contractState._volatile.watch) this.config.reactiveSet(contractState._volatile, 'watch', [[keyName, externalContractID]])
        if (Array.isArray(contractState._volatile.watch) && !contractState._volatile.watch.find((v) => v[0] === keyName && v[1] === externalContractID)) contractState._volatile.watch.push([keyName, externalContractID])
      }
    })

    // If there are keys that need to be revoked, queue an event to handle the
    // deletion
    if (keysToDelete.length || keysToUpdate.length) {
      if (!externalContractState._volatile) {
        this.config.reactiveSet(externalContractState, '_volatile', Object.create(null))
      }
      if (!externalContractState._volatile.pendingKeyRevocations) {
        this.config.reactiveSet(externalContractState._volatile, 'pendingKeyRevocations', Object.create(null))
      }
      keysToDelete.forEach((id) => this.config.reactiveSet(externalContractState._volatile.pendingKeyRevocations, id, 'del'))
      keysToUpdate.forEach((id) => this.config.reactiveSet(externalContractState._volatile.pendingKeyRevocations, id, true))

      sbp('chelonia/private/queueEvent', externalContractID, ['chelonia/private/deleteOrRotateRevokedKeys', externalContractID]).catch((e) => {
        console.error(`Error at deleteOrRotateRevokedKeys for contractID ${contractID} and externalContractID ${externalContractID}`, e)
      })
    }
  },
  // The following function gets called when we start watching a contract for
  // foreign keys for the first time, and it ensures that, at the point the
  // watching starts, keys are in sync between the two contracts (later on,
  // this will be handled automatically for incoming OP_KEY_DEL and
  // OP_KEY_UPDATE).
  // For any given foreign key, there are three possible states:
  //   1. The key is in sync with the foreign contract. In this case, there's
  //      nothing left to do.
  //   2. The key has been rotated in the foreign contract (replaced by another
  //      key of the same name). We need to mirror this operation manually
  //      since watching only affects new messages we receive.
  //   3. The key has been removed in the foreign contract. We also need to
  //      mirror the operation.
  'chelonia/private/deleteOrRotateRevokedKeys': function (contractID: string) {
    const rootState = sbp(this.config.stateSelector)
    const contractState = rootState[contractID]
    const pendingKeyRevocations = contractState?._volatile.pendingKeyRevocations

    if (!pendingKeyRevocations || Object.keys(pendingKeyRevocations).length === 0) return

    // First, we handle keys that have been rotated
    const keysToUpdate: string[] = Object.entries(pendingKeyRevocations).filter(([, v]) => v === true).map(([id]) => id)

    // Aggregate the keys that we can update to send them in a single operation
    const [, keyUpdateSigningKeyId, keyUpdateArgs] = keysToUpdate.reduce((acc, keyId) => {
      const key = contractState._vm?.authorizedKeys?.[keyId]
      if (!key || !key.foreignKey) return acc
      const foreignKey = String(key.foreignKey)
      const fkUrl = new URL(foreignKey)
      const foreignContractID = fkUrl.pathname
      const foreignKeyName = fkUrl.searchParams.get('keyName')
      if (!foreignKeyName) throw new Error('Missing foreign key name')
      const foreignState = rootState[foreignContractID]
      if (!foreignState) return acc
      const fKeyId = findKeyIdByName(foreignState, foreignKeyName)
      if (!fKeyId) {
        // Key was deleted; mark it for deletion
        pendingKeyRevocations.find(([id]) => id === keyId)[1] = 'del'
        return acc
      }

      const [currentRingLevel, currentSigningKeyId, currentKeyArgs] = acc
      const ringLevel = Math.min(currentRingLevel, key.ringLevel ?? Number.POSITIVE_INFINITY)
      if (ringLevel >= currentRingLevel) {
        (currentKeyArgs: any).push({
          name: key.name,
          oldKeyId: keyId,
          id: fKeyId,
          data: foreignState._vm.authorizedKeys[fKeyId].data
        })
        return [currentRingLevel, currentSigningKeyId, currentKeyArgs]
      } else if (Number.isFinite(ringLevel)) {
        const signingKeyId = findSuitableSecretKeyId(contractState, [SPMessage.OP_KEY_UPDATE], ['sig'], ringLevel)
        if (signingKeyId) {
          (currentKeyArgs: any).push({
            name: key.name,
            oldKeyId: keyId,
            id: fKeyId,
            data: foreignState._vm.authorizedKeys[fKeyId].data
          })
          return [ringLevel, signingKeyId, currentKeyArgs]
        }
      }
      return acc
    }, [Number.POSITIVE_INFINITY, '', []])

    if (keyUpdateArgs.length !== 0) {
      const contractName = contractState._vm.type

      // This is safe to do without await because it's sending an operation
      // Using await could deadlock when retrying to send the message
      sbp('chelonia/out/keyUpdate', { contractID, contractName, data: keyUpdateArgs, signingKeyId: keyUpdateSigningKeyId }).catch(e => {
        console.error(`[chelonia/private/deleteOrRotateRevokedKeys] Error sending OP_KEY_UPDATE for ${contractID}`, e.message)
      })
    }

    // And then, we handle keys that have been deleted
    const keysToDelete = Object.entries(pendingKeyRevocations).filter(([, v]) => v === 'del').map(([id]) => id)

    // Aggregate the keys that we can delete to send them in a single operation
    const [, keyDelSigningKeyId, keyIdsToDelete] = keysToDelete.reduce((acc, keyId) => {
      const [currentRingLevel, currentSigningKeyId, currentKeyIds] = acc
      const ringLevel = Math.min(currentRingLevel, contractState._vm?.authorizedKeys?.[keyId]?.ringLevel ?? Number.POSITIVE_INFINITY)
      if (ringLevel >= currentRingLevel) {
        (currentKeyIds: any).push(keyId)
        return [currentRingLevel, currentSigningKeyId, currentKeyIds]
      } else if (Number.isFinite(ringLevel)) {
        const signingKeyId = findSuitableSecretKeyId(contractState, [SPMessage.OP_KEY_DEL], ['sig'], ringLevel)
        if (signingKeyId) {
          (currentKeyIds: any).push(keyId)
          return [ringLevel, signingKeyId, currentKeyIds]
        }
      }
      return acc
    }, [Number.POSITIVE_INFINITY, '', []])

    if (keyIdsToDelete.length !== 0) {
      const contractName = contractState._vm.type

      // This is safe to do without await because it's sending an operation
      // Using await could deadlock when retrying to send the message
      sbp('chelonia/out/keyDel', { contractID, contractName, data: keyIdsToDelete, signingKeyId: keyDelSigningKeyId }).catch(e => {
        console.error(`[chelonia/private/deleteRevokedKeys] Error sending OP_KEY_DEL for ${contractID}`, e.message)
      })
    }
  },
  'chelonia/private/respondToAllKeyRequests': function (contractID: string) {
    const state = sbp(this.config.stateSelector)
    const contractState = state[contractID] ?? {}

    const pending = contractState?._vm?.pendingKeyshares
    if (!pending) return

    const signingKeyId = findSuitableSecretKeyId(contractState, [SPMessage.OP_ATOMIC, SPMessage.OP_KEY_REQUEST_SEEN, SPMessage.OP_KEY_SHARE], ['sig'])

    if (!signingKeyId) {
      console.log('Unable to respond to key request because there is no suitable secret key with OP_KEY_REQUEST_SEEN permission')
      return
    }

    Object.entries(pending).map(([hash, entry]) => {
      if (!Array.isArray(entry) || entry.length !== 4) {
        return undefined
      }

      const [,,, [originatingContractID]] = ((entry: any): [boolean, number, string, [string, Object, number, string]])

      return sbp('chelonia/private/queueEvent', originatingContractID, ['chelonia/private/respondToKeyRequest', contractID, signingKeyId, hash]).catch((e) => {
        console.error(`respondToAllKeyRequests: Error responding to key request ${hash} from ${originatingContractID} to ${contractID}`, e)
      })
    })
  },
  'chelonia/private/respondToKeyRequest': async function (contractID: string, signingKeyId: string, hash: string) {
    const state = sbp(this.config.stateSelector)
    const contractState = state[contractID]
    const entry = contractState?._vm?.pendingKeyshares?.[hash]
    const instance = this._instance

    if (!Array.isArray(entry) || entry.length !== 4) {
      return
    }

    const [keyShareEncryption, height, , [originatingContractID, rv, originatingContractHeight, headJSON]] = ((entry: any): [boolean, number, string, [string, Object, number, string]])
    entry.pop()

    const krsEncryption = !!state._vm?.invites?.[signingKeyId]?.private

    // 1. Sync (originating) identity contract

    await sbp('chelonia/private/in/syncContract', originatingContractID)
    if (instance !== this._instance) return

    const originatingState = state[originatingContractID]
    const contractName = state.contracts[contractID].type
    const originatingContractName = originatingState._vm.type

    const v = signedIncomingData(originatingContractID, originatingState, rv, originatingContractHeight, headJSON).valueOf()

    // 2. Verify 'data'
    const { encryptionKeyId } = v

    const responseKey = encryptedIncomingData(contractID, contractState, v.responseKey, height, this.secretKeys, headJSON).valueOf()

    const deserializedResponseKey = deserializeKey(responseKey)
    const responseKeyId = keyId(deserializedResponseKey)

    // This is safe to do without await because it's sending actions
    // If we had await it could deadlock when retrying to send the event
    Promise.resolve().then(() => {
      if (instance !== this._instance) return
      if (!has(originatingState._vm.authorizedKeys, responseKeyId) || originatingState._vm.authorizedKeys[responseKeyId]._notAfterHeight != null) {
        throw new Error(`Unable to respond to key request for ${originatingContractID}. Key ${responseKeyId} is not valid.`)
      }

      // We don't need to worry about persistence (if it was an outgoing
      // message) here as this is done from an internal side-effect.
      sbp('chelonia/storeSecretKeys', new Secret([
        { key: deserializedResponseKey }
      ]))

      const keys = pick(
        state.secretKeys,
        Object.entries(contractState._vm.authorizedKeys)
          .filter(([, key]) => !!(key: any).meta?.private?.shareable)
          .map(([kId]) => kId)
      )

      if (!keys || Object.keys(keys).length === 0) {
        console.info('respondToAllKeyRequests: no keys to share', { contractID, originatingContractID })
        return
      }

      const keySharePayload = {
        contractID: contractID,
        keys: Object.entries(keys).map(([keyId, key]: [string, mixed]) => ({
          id: keyId,
          meta: {
            private: {
              content: encryptedOutgoingData(originatingContractID, encryptionKeyId, key),
              shareable: true
            }
          }
        })),
        keyRequestHash: hash,
        keyRequestHeight: height
      }

      // 3. Send OP_KEY_SHARE to identity contract
      if (!contractState?._vm?.pendingKeyshares?.[hash]) {
      // While we were getting ready, another client may have shared the keys
        return
      }

      return keySharePayload
    }).then((keySharePayload) => {
      if (instance !== this._instance || !keySharePayload) return

      return sbp('chelonia/out/keyShare', {
        contractID: originatingContractID,
        contractName: originatingContractName,
        data: keyShareEncryption
          ? encryptedOutgoingData(
            originatingContractID,
            findSuitablePublicKeyIds(originatingState, [SPMessage.OP_KEY_SHARE], ['enc'])?.[0] || '',
            keySharePayload
          )
          : keySharePayload,
        signingKeyId: responseKeyId
      }).then((msg) => {
        if (instance !== this._instance) return

        // 4(i). Remove originating contract and update current contract with information
        const payload = { keyRequestHash: hash, keyShareHash: msg.hash(), success: true }
        const connectionKeyPayload = {
          contractID: originatingContractID,
          keys: [
            {
              id: responseKeyId,
              meta: {
                private: {
                  content: encryptedOutgoingData(contractID, findSuitablePublicKeyIds(contractState, [SPMessage.OP_KEY_REQUEST_SEEN], ['enc'])?.[0] || '', responseKey),
                  shareable: true
                }
              }
            }
          ]
        }

        // This is safe to do without await because it's sending an action
        // If we had await it could deadlock when retrying to send the event
        sbp('chelonia/out/atomic', {
          contractID,
          contractName,
          signingKeyId,
          data: [
            [
              'chelonia/out/keyRequestResponse',
              {
                data:
                krsEncryption
                  ? encryptedOutgoingData(
                    contractID,
                    findSuitablePublicKeyIds(contractState, [SPMessage.OP_KEY_REQUEST_SEEN], ['enc'])?.[0] || '',
                    payload
                  )
                  : payload
              }
            ],
            [
              // Upon successful key share, we want to share deserializedResponseKey
              // with ourselves
              'chelonia/out/keyShare',
              {
                data: keyShareEncryption
                  ? encryptedOutgoingData(
                    contractID,
                    findSuitablePublicKeyIds(contractState, [SPMessage.OP_KEY_SHARE], ['enc'])?.[0] || '',
                    connectionKeyPayload
                  )
                  : connectionKeyPayload
              }
            ]
          ]
        }).catch((e) => {
          console.error('Error at respondToKeyRequest while sending keyRequestResponse', e)
        })
      })
    }).catch((e) => {
      console.error('Error at respondToKeyRequest', e)
      const payload = { keyRequestHash: hash, success: false }

      // 4(ii). Remove originating contract and update current contract with information
      if (!contractState?._vm?.pendingKeyshares?.[hash]) {
        // While we were getting ready, another client may have shared the keys
        return
      }

      // This is safe to do without await because it's sending an action
      // If we had await it could deadlock when retrying to send the event
      sbp('chelonia/out/keyRequestResponse', {
        contractID,
        contractName,
        signingKeyId,
        data: krsEncryption
          ? encryptedOutgoingData(contractID, findSuitablePublicKeyIds(contractState, [SPMessage.OP_KEY_REQUEST_SEEN], ['enc'])?.[0] || '', payload)
          : payload
      }).catch((e) => {
        console.error('Error at respondToKeyRequest while sending keyRequestResponse in error handler', e)
      })
    })
  },
  'chelonia/private/in/handleEvent': async function (contractID: string, rawMessage: string) {
    const state = sbp(this.config.stateSelector)
    const { preHandleEvent, postHandleEvent, handleEventError } = this.config.hooks
    let processingErrored = false
    let message
    // Errors in mutations result in ignored messages
    // Errors in side effects result in dropped messages to be reprocessed
    try {
      // verify we're expecting to hear from this contract
      if (!this.config.acceptAllMessages && !this.pending.some((entry) => entry?.contractID === contractID) && !this.subscriptionSet.has(contractID)) {
        console.warn(`[chelonia] WARN: ignoring unexpected event for ${contractID}:`, rawMessage)
        return
      }
      // contractStateCopy has a copy of the current contract state, or an empty
      // object if the state doesn't exist. This copy will be used to apply
      // any changes from processing the current event as well as when calling
      // side-effects and, once everything is processed, it will be applied
      // to the global state. Important note: because the state change is
      // applied to the Vuex state only if process is successful (and after both
      // process and the sideEffect finish), any sideEffects that need to the
      // access the state should do so only through the state that is passed in
      // to the call to the sideEffect, or through a call though queueInvocation
      // (so that the side effect runs after the changes are applied)
      const contractStateCopy = state[contractID] ? cloneDeep(state[contractID]) : Object.create(null)
      // Now, deserialize the messsage
      // The message is deserialized *here* and not earlier because deserialize
      // constructs objects of signedIncomingData and encryptedIncomingData
      // which are bound to the state. For some opcodes (such as OP_ATOMIC), the
      // state could change in ways that are significant for further processing,
      // so those objects need to be bound to the state copy (which is mutated)
      // as opposed to the the root state (which is mutated only after
      // processing is done).
      // For instance, let's say the message contains an OP_ATOMIC comprising
      // two operations: OP_KEY_ADD (adding a signing key) and OP_ACTION_ENCRYPTED
      // (with an inner signature using this key in OP_KEY_ADD). If the state
      // is bound to the copy (as below), then by the time OP_ACTION_ENCRYPTED
      // is processed, the result of OP_KEY_ADD has been applied to the state
      // copy. If we didn't specify a state or instead grabbed it from the root
      // state, then we wouldn't be able to process OP_ACTION_ENCRYPTED correctly,
      // as we wouldn't know that the key is valid from that state, and the
      // state copy (contractStateCopy) is only written to the root state after
      // all processing has completed.
      message = SPMessage.deserialize(rawMessage, this.transientSecretKeys, contractStateCopy)
      if (message.contractID() !== contractID) {
        throw new Error(`[chelonia] Wrong contract ID. Expected ${contractID} but got ${message.contractID()}`)
      }
      if (!message.isFirstMessage() && (!has(state.contracts, contractID) || !has(state, contractID))) {
        throw new ChelErrorUnrecoverable('The event is not for a first message but the contract state is missing')
      }
      preHandleEvent?.(message)
      // the order the following actions are done is critically important!
      // first we make sure we can save this message to the db
      // if an exception is thrown here we do not need to revert the state
      // because nothing has been processed yet
      const proceed = handleEvent.checkMessageOrdering.call(this, message)
      if (proceed === false) return

      // If the contract was marked as dirty, we stop processing
      // The 'dirty' flag is set, possibly *by another contract*, indicating
      // that a previously unknown encryption key has been received. This means
      // that the current state is invalid (because it could changed based on
      // this new information) and we must re-sync the contract. When this
      // happens, we stop processing because the state will be regenerated.
      if (state[contractID]?._volatile?.dirty) {
        console.info(`[chelonia] Ignoring message ${message.description()} as the contract is marked as dirty`)
        return
      }

      const internalSideEffectStack = !this.config.skipSideEffects ? [] : undefined

      // process the mutation on the state
      // IMPORTANT: even though we 'await' processMutation, everything in your
      //            contract's 'process' function must be synchronous! The only
      //            reason we 'await' here is to dynamically load any new contract
      //            source / definitions specified by the SPMessage
      missingDecryptionKeyIdsMap.delete(message)
      try {
        await handleEvent.processMutation.call(this, message, contractStateCopy, internalSideEffectStack)
      } catch (e) {
        if (e?.name === 'ChelErrorDecryptionKeyNotFound') {
          console.warn(`[chelonia] WARN '${e.name}' in processMutation for ${message.description()}: ${e.message}`, e, message.serialize())
          if (e.cause) {
            const missingDecryptionKeyIds = missingDecryptionKeyIdsMap.get(message)
            if (missingDecryptionKeyIds) {
              missingDecryptionKeyIds.add(e.cause)
            } else {
              missingDecryptionKeyIdsMap.set(message, new Set([e.cause]))
            }
          }
        } else {
          console.error(`[chelonia] ERROR '${e.name}' in processMutation for ${message.description()}: ${e.message || e}`, e, message.serialize())
        }
        // we revert any changes to the contract state that occurred, ignoring this mutation
        console.warn(`[chelonia] Error processing ${message.description()}: ${message.serialize()}. Any side effects will be skipped!`)
        if (this.config.strictProcessing) {
          throw e
        }
        processingErrored = e?.name !== 'ChelErrorWarning'
        this.config.hooks.processError?.(e, message, getMsgMeta(message, contractID, contractStateCopy))
        // special error that prevents the head from being updated, effectively killing the contract
        if (
          e.name === 'ChelErrorUnrecoverable' ||
          e.name === 'ChelErrorForkedChain' ||
          message.isFirstMessage()
        ) {
          throw e
        }
      }

      // process any side-effects (these must never result in any mutation to the contract state!)
      if (!processingErrored) {
        // Gets run get when skipSideEffects is false
        if (Array.isArray(internalSideEffectStack) && internalSideEffectStack.length > 0) {
          await Promise.all(internalSideEffectStack.map(fn => Promise.resolve(fn({ state: contractStateCopy, message })).catch((e) => {
            console.error(`[chelonia] ERROR '${e.name}' in internal side effect for ${message.description()}: ${e.message}`, e, { message: message.serialize() })
          })))
        }

        if (!this.config.skipActionProcessing && !this.config.skipSideEffects) {
          await handleEvent.processSideEffects.call(this, message, contractStateCopy)?.catch((e) => {
            console.error(`[chelonia] ERROR '${e.name}' in sideEffect for ${message.description()}: ${e.message}`, e, { message: message.serialize() })
            // We used to revert the state and rethrow the error here, but we no longer do that
            // see this issue for why: https://github.com/okTurtles/group-income/issues/1544
            this.config.hooks.sideEffectError?.(e, message)
          })
        }
      }

      // We keep changes to the contract state and state.contracts as close as
      // possible in the code to reduce the chances of still ending up with
      // an inconsistent state if a sudden failure happens while this code
      // is executing. In particular, everything in between should be synchronous.
      // This block will apply all the changes related to modifying the state
      // after an event has been processed:
      //   1. Adding the messge to the DB
      //   2. Applying changes to the contract state
      //   3. Applying changes to rootState.contracts
      try {
        const state = sbp(this.config.stateSelector)
        await handleEvent.applyProcessResult.call(this, { message, state, contractState: contractStateCopy, processingErrored, postHandleEvent })
      } catch (e) {
        console.error(`[chelonia] ERROR '${e.name}' for ${message.description()} marking the event as processed: ${e.message}`, e, { message: message.serialize() })
      }
    } catch (e) {
      console.error(`[chelonia] ERROR in handleEvent: ${e.message || e}`, e)
      try {
        handleEventError?.(e, message)
      } catch (e2) {
        console.error('[chelonia] Ignoring user error in handleEventError hook:', e2)
      }
      throw e
    } finally {
      if (message) {
        missingDecryptionKeyIdsMap.delete(message)
      }
    }
  }
}): string[])

const eventsToReingest = []
const reprocessDebounced = debounce((contractID) => sbp('chelonia/private/out/sync', contractID, { force: true }).catch((e) => {
  console.error(`[chelonia] Error at reprocessDebounced for ${contractID}`)
}), 1000)

const handleEvent = {
  checkMessageOrdering (message: SPMessage) {
    const contractID = message.contractID()
    const hash = message.hash()
    const height = message.height()
    const state = sbp(this.config.stateSelector)
    // The latest height we want to use is the one from `state.contracts` and
    // not the one from the DB. The height in the state reflects the latest
    // message that's been processed, which is desired here. On the other hand,
    // the DB function includes the latest known message for that contract,
    // which can be ahead of the latest message processed.
    const latestProcessedHeight = state.contracts[contractID]?.height
    if (!Number.isSafeInteger(height)) {
      throw new ChelErrorDBBadPreviousHEAD(`Message ${hash} in contract ${contractID} has an invalid height.`)
    }
    // Avoid re-processing already processed messages
    if (
      message.isFirstMessage()
        // If this is the first message, the height is is expected not to exist
        ? latestProcessedHeight != null
        // If this isn't the first message, the height must not be lower than the
        // current's message height. The check is negated to handle NaN values
        : !(latestProcessedHeight < height)
    ) {
      // The web client may sometimes get repeated messages. If strict ordering
      // isn't enabled, instead of throwing we return false.
      // On the other hand, the server must enforce strict ordering.
      if (!this.config.strictOrdering) {
        return false
      }
      throw new ChelErrorAlreadyProcessed(`Message ${hash} with height ${height} in contract ${contractID} has already been processed. Current height: ${latestProcessedHeight}.`)
    }
    // If the message is from the future, add it to eventsToReingest
    if ((latestProcessedHeight + 1) < height) {
      if (this.config.strictOrdering) {
        throw new ChelErrorDBBadPreviousHEAD(`Unexpected message ${hash} with height ${height} in contract ${contractID}: height is too high. Current height: ${latestProcessedHeight}.`)
      }
      // sometimes we simply miss messages, it's not clear why, but it happens
      // in rare cases. So we attempt to re-sync this contract once
      if (eventsToReingest.length > 100) {
        throw new ChelErrorUnrecoverable('more than 100 different bad previousHEAD errors')
      }
      if (!eventsToReingest.includes(hash)) {
        console.warn(`[chelonia] WARN bad previousHEAD for ${message.description()}, will attempt to re-sync contract to reingest message`)
        eventsToReingest.push(hash)
        reprocessDebounced(contractID)
        return false // ignore the error for now
      } else {
        console.error(`[chelonia] ERROR already attempted to reingest ${message.description()}, will not attempt again!`)
        throw new ChelErrorDBBadPreviousHEAD(`Already attempted to reingest ${hash}`)
      }
    }
    const reprocessIdx = eventsToReingest.indexOf(hash)
    if (reprocessIdx !== -1) {
      console.warn(`[chelonia] WARN: successfully reingested ${message.description()}`)
      eventsToReingest.splice(reprocessIdx, 1)
    }
  },
  async processMutation (message: SPMessage, state: Object, internalSideEffectStack?: any[]) {
    const contractID = message.contractID()
    if (message.isFirstMessage()) {
      // Allow having _volatile but nothing else if this is the first message,
      // as we should be starting off with a clean state
      if (Object.keys(state).some(k => k !== '_volatile')) {
        throw new ChelErrorUnrecoverable(`state for ${contractID} is already set`)
      }
    }
    await sbp('chelonia/private/in/processMessage', message, state, internalSideEffectStack)
  },
  processSideEffects (message: SPMessage, state: Object) {
    const opT = message.opType()
    if (![SPMessage.OP_ATOMIC, SPMessage.OP_ACTION_ENCRYPTED, SPMessage.OP_ACTION_UNENCRYPTED].includes(opT)) {
      return
    }

    const contractID = message.contractID()
    const manifestHash = message.manifest()
    const hash = message.hash()
    const height = message.height()
    const signingKeyId = message.signingKeyId()

    const callSideEffect = async (field) => {
      let v = unwrapMaybeEncryptedData(field)
      if (!v) return
      v = v.data
      let innerSigningKeyId: string | typeof undefined
      if (isSignedData(v)) {
        innerSigningKeyId = (v: any).signingKeyId
        v = (v: any).valueOf()
      }

      const { action, data, meta } = (v: any)
      const mutation = {
        data,
        meta,
        hash,
        height,
        contractID,
        description: message.description(),
        direction: message.direction(),
        signingKeyId,
        get signingContractID () {
          return getContractIDfromKeyId(contractID, signingKeyId, state)
        },
        innerSigningKeyId,
        get innerSigningContractID () {
          return getContractIDfromKeyId(contractID, innerSigningKeyId, state)
        }
      }
      return await sbp(`${manifestHash}/${action}/sideEffect`, mutation, state)
    }
    const msg = Object(message.message())

    if (opT !== SPMessage.OP_ATOMIC) {
      return callSideEffect(msg)
    }

    const reducer = (acc, [opT, opV]) => {
      if ([SPMessage.OP_ACTION_ENCRYPTED, SPMessage.OP_ACTION_UNENCRYPTED].includes(opT)) {
        acc.push(Object(opV))
      }
      return acc
    }

    const actionsOpV = ((msg: any): SPOpAtomic).reduce(reducer, [])

    return Promise.allSettled(actionsOpV.map((action) => callSideEffect(action))).then((results) => {
      const errors = results.filter((r) => r.status === 'rejected').map((r) => (r: any).reason)
      if (errors.length > 0) {
        console.error('Side-effect errors', contractID, errors)
        // $FlowFixMe[cannot-resolve-name]
        throw new AggregateError(errors, `Error at side effects for ${contractID}`)
      }
    })
  },
  async applyProcessResult ({ message, state, contractState, processingErrored, postHandleEvent }: { message: SPMessage, state: Object, contractState: Object, processingErrored: boolean, postHandleEvent: ?Function }) {
    const contractID = message.contractID()
    const hash = message.hash()
    const height = message.height()

    await sbp('chelonia/db/addEntry', message)
    if (!processingErrored) {
      // Once side-effects are called, we apply changes to the state.
      // This means, as mentioned above, that retrieving the contract state
      // via the global state will yield incorrect results. Doing things in
      // this order ensures that incomplete processing of events (i.e., process
      // + side-effects), e.g., due to sudden failures (like power outages,
      // Internet being disconnected, etc.) aren't persisted. This allows
      // us to recover by re-processing the event when these sudden failures
      // happen
      this.config.reactiveSet(state, contractID, contractState)

      try {
        postHandleEvent?.(message)
      } catch (e) {
        console.error(`[chelonia] ERROR '${e.name}' for ${message.description()} in event post-handling: ${e.message}`, e, { message: message.serialize() })
      }
    }
    // whether or not there was an exception, we proceed ahead with updating the head
    // you can prevent this by throwing an exception in the processError hook
    if (message.isFirstMessage()) {
      const { type } = ((message.opValue(): any): SPOpContract)
      if (!has(state.contracts, contractID)) {
        this.config.reactiveSet(state.contracts, contractID, Object.create(null))
      }
      this.config.reactiveSet(state.contracts[contractID], 'type', type)
      console.debug(`contract ${type} registered for ${contractID}`)
    }
    if (message.isKeyOp()) {
      this.config.reactiveSet(state.contracts[contractID], 'previousKeyOp', hash)
    }
    this.config.reactiveSet(state.contracts[contractID], 'HEAD', hash)
    this.config.reactiveSet(state.contracts[contractID], 'height', height)
    // If there were decryption errors due to missing encryption keys, we store
    // those key IDs. If those key IDs are later shared with us, we can re-sync
    // the contract. Without this information, we can only guess whether a
    // re-sync is needed or not.
    // We do it here because the property is stored under `.contracts` instead
    // of in the contract state itself, and this is where `.contracts` gets
    // updated after handling a message.
    const missingDecryptionKeyIdsForMessage = missingDecryptionKeyIdsMap.get(message)
    if (missingDecryptionKeyIdsForMessage) {
      let missingDecryptionKeyIds = state.contracts[contractID].missingDecryptionKeyIds
      if (!missingDecryptionKeyIds) {
        missingDecryptionKeyIds = []
        this.config.reactiveSet(state.contracts[contractID], 'missingDecryptionKeyIds', missingDecryptionKeyIds)
      }
      missingDecryptionKeyIdsForMessage.forEach(keyId => {
        if (missingDecryptionKeyIds.includes(keyId)) return
        missingDecryptionKeyIds.push(keyId)
      })
    }

    if (!this.subscriptionSet.has(contractID)) {
      const entry = this.pending.find((entry) => entry?.contractID === contractID)
      // we've successfully received it back, so remove it from expectation pending
      if (entry) {
        const index = this.pending.indexOf(entry)
        if (index !== -1) {
          this.pending.splice(index, 1)
        }
      }
      this.subscriptionSet.add(contractID)
      sbp('okTurtles.events/emit', CONTRACTS_MODIFIED, Array.from(this.subscriptionSet), { added: [contractID], removed: [] })
    }

    if (!processingErrored) {
      sbp('okTurtles.events/emit', hash, contractID, message)
      sbp('okTurtles.events/emit', EVENT_HANDLED, contractID, message)
    }
  }
}

const notImplemented = (v) => {
  throw new Error(`chelonia: action not implemented to handle: ${JSON.stringify(v)}.`)
}

// The code below represents different ways to dynamically load code at runtime,
// and the SES example shows how to sandbox runtime loaded code (although it doesn't
// work, see https://github.com/endojs/endo/issues/1207 for details). It's also not
// super important since we're loaded signed contracts.
/*
// https://2ality.com/2019/10/eval-via-import.html
// Example: await import(esm`${source}`)
// const esm = ({ raw }, ...vals) => {
//   return URL.createObjectURL(new Blob([String.raw({ raw }, ...vals)], { type: 'text/javascript' }))
// }

// await loadScript.call(this, contractInfo.file, source, contractInfo.hash)
//   .then(x => {
//     console.debug(`loaded ${contractInfo.file}`)
//     return x
//   })
// eslint-disable-next-line no-unused-vars
function loadScript (file, source, hash) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    // script.type = 'application/javascript'
    script.type = 'module'
    // problem with this is that scripts will step on each other's feet
    script.text = source
    // NOTE: this will work if the file route adds .header('Content-Type', 'application/javascript')
    // script.src = `${this.config.connectionURL}/file/${hash}`
    // this results in: "SyntaxError: import declarations may only appear at top level of a module"
    // script.text = `(function () {
    //   ${source}
    // })()`
    script.onload = () => resolve(script)
    script.onerror = (err) => reject(new Error(`${err || 'Error'} trying to load: ${file}`))
    document.getElementsByTagName('head')[0].appendChild(script)
  })
}

// This code is cobbled together based on:
// https://github.com/endojs/endo/blob/master/packages/ses/test/test-import-cjs.js
// https://github.com/endojs/endo/blob/master/packages/ses/test/test-import.js
//   const vm = await sesImportVM.call(this, `${this.config.connectionURL}/file/${contractInfo.hash}`)
// eslint-disable-next-line no-unused-vars
function sesImportVM (url): Promise<Object> {
  // eslint-disable-next-line no-undef
  const vm = new Compartment(
    {
      ...this.config.contracts.defaults.exposedGlobals,
      console
    },
    {}, // module map
    {
      resolveHook (spec, referrer) {
        console.debug('resolveHook', { spec, referrer })
        return spec
      },
      // eslint-disable-next-line require-await
      async importHook (moduleSpecifier: string, ...args) {
        const source = await this.config.fetch(moduleSpecifier).then(handleFetchResult('text'))
        console.debug('importHook', { fetch: moduleSpecifier, args, source })
        const execute = (moduleExports, compartment, resolvedImports) => {
          console.debug('execute called with:', { moduleExports, resolvedImports })
          const functor = compartment.evaluate(
            `(function (require, exports, module, __filename, __dirname) { ${source} })`
            // this doesn't seem to help with: https://github.com/endojs/endo/issues/1207
            // { __evadeHtmlCommentTest__: false, __rejectSomeDirectEvalExpressions__: false }
          )
          const require_ = (importSpecifier) => {
            console.debug('in-source require called with:', importSpecifier, 'keying:', resolvedImports)
            const namespace = compartment.importNow(resolvedImports[importSpecifier])
            console.debug('got namespace:', namespace)
            return namespace.default === undefined ? namespace : namespace.default
          }
          const module_ = {
            get exports () {
              return moduleExports
            },
            set exports (newModuleExports) {
              moduleExports.default = newModuleExports
            }
          }
          functor(require_, moduleExports, module_, moduleSpecifier)
        }
        if (moduleSpecifier === '@common/common.js') {
          return {
            imports: [],
            exports: ['Vue', 'L'],
            execute
          }
        } else {
          return {
            imports: ['@common/common.js'],
            exports: [],
            execute
          }
        }
      }
    }
  )
  // vm.evaluate(source)
  return vm.import(url)
}
*/
