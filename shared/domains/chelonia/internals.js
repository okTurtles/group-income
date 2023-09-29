'use strict'

import sbp, { domainFromSelector } from '@sbp/sbp'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'
import { cloneDeep, debounce, delay, has, pick, randomIntFromRange } from '~/frontend/model/contracts/shared/giLodash.js'
import { b64ToStr, blake32Hash } from '~/shared/functions.js'
import type { GIKey, GIOpActionEncrypted, GIOpActionUnencrypted, GIOpAtomic, GIOpContract, GIOpKeyAdd, GIOpKeyDel, GIOpKeyRequest, GIOpKeyRequestSeen, GIOpKeyShare, GIOpKeyUpdate, GIOpPropSet, GIOpType, ProtoGIOpKeyRequestSeen, ProtoGIOpKeyShare } from './GIMessage.js'
import { GIMessage } from './GIMessage.js'
import { INVITE_STATUS } from './constants.js'
import { deserializeKey, keyId } from './crypto.js'
import './db.js'
import { encryptedIncomingData, encryptedOutgoingData, unwrapMaybeEncryptedData } from './encryptedData.js'
import type { EncryptedData } from './encryptedData.js'
import { ChelErrorUnrecoverable } from './errors.js'
import { CONTRACTS_MODIFIED, CONTRACT_HAS_RECEIVED_KEYS, CONTRACT_IS_SYNCING, EVENT_HANDLED } from './events.js'
import { findSuitablePublicKeyIds, findSuitableSecretKeyId, keyAdditionProcessor, recreateEvent, validateKeyPermissions, validateKeyAddPermissions, validateKeyDelPermissions, validateKeyUpdatePermissions } from './utils.js'
import { isSignedData, signedIncomingData } from './signedData.js'
// import 'ses'

const getContractIDfromKeyId = (contractID: string, signingKeyId?: string, state: Object) => {
  return signingKeyId && state._vm.authorizedKeys[signingKeyId].foreignKey
    ? new URL(state._vm.authorizedKeys[signingKeyId].foreignKey).pathname
    : contractID
}

const keysToMap = (keys: (GIKey | EncryptedData<GIKey>)[], height: number, authorizedKeys?: Object): Object => {
  // Using cloneDeep to ensure that the returned object is serializable
  // Keys in a GIMessage may not be serializable (i.e., supported by the
  // structured clone algorithm) when they contain encryptedIncomingData
  keys = keys.map((key) => {
    const data = unwrapMaybeEncryptedData(key)
    if (!data) return undefined
    if (data.encryptionKeyId) {
      data.data._private = data.encryptionKeyId
    }
    return ((data.data: any): GIKey)
  }).filter(Boolean)

  const keysCopy = cloneDeep(keys)
  return Object.fromEntries(keysCopy.map((key, i) => {
    key._notBeforeHeight = height
    if (authorizedKeys?.[key.id]) {
      if (authorizedKeys[key.id]._notAfterHeight == null) {
        throw new Error('Cannot set existing unrevoked key')
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
  if (Array.isArray(state._volatile?.watch)) {
    const rootState = sbp(config.stateSelector)
    const watchMap = Object.create(null)

    state._volatile.watch.forEach(([name, cID]) => {
      if (!updatedKeysMap[name] || watchMap[cID] === null) {
        return
      }
      if (!watchMap[cID]) {
        if (!rootState.contracts[cID]?.type || !findSuitableSecretKeyId(rootState[cID], [GIMessage.OP_KEY_UPDATE], ['sig'])) {
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

        const encryptionKeyId = foreignContractKey._private

        if (signingKeyId) {
          return [[name, foreignContractKey.name, encryptionKeyId], signingKeyId, rootState[cID]._vm.authorizedKeys[signingKeyId].ringLevel]
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

      internalSideEffectStack?.push(async () => {
        try {
          await sbp(outputSelector, {
            contractID: cID,
            contractName,
            data: keyNamesToUpdate.map(outputMapper).map((v, i) => {
              if (keyNamesToUpdate[i][2]) {
                return encryptedOutgoingData(rootState[cID], keyNamesToUpdate[i][2], v)
              }
              return v
            }),
            signingKeyId
          })
        } catch (e) {
          console.warn(`Error mirroring key operation (${outputSelector}) from ${contractID} to ${cID}: ${e?.message || e}`)
        }
      })
    })
  }
}

// export const FERAL_FUNCTION = Function

export default (sbp('sbp/selectors/register', {
  //     DO NOT CALL ANY OF THESE YOURSELF!
  'chelonia/private/state': function () {
    return this.state
  },
  'chelonia/private/loadManifest': async function (manifestHash: string) {
    if (this.manifestToContract[manifestHash]) {
      console.warn('[chelonia]: already loaded manifest', manifestHash)
      return
    }
    const manifestURL = `${this.config.connectionURL}/file/${manifestHash}`
    const manifest = await fetch(manifestURL).then(handleFetchResult('json'))
    const body = JSON.parse(manifest.body)
    const contractInfo = (this.config.contracts.defaults.preferSlim && body.contractSlim) || body.contract
    console.info(`[chelonia] loading contract '${contractInfo.file}'@'${body.version}' from manifest: ${manifestHash}`)
    const source = await fetch(`${this.config.connectionURL}/file/${contractInfo.hash}`)
      .then(handleFetchResult('text'))
    const sourceHash = blake32Hash(source)
    if (sourceHash !== contractInfo.hash) {
      throw new Error(`bad hash ${sourceHash} for contract '${contractInfo.file}'! Should be: ${contractInfo.hash}`)
    }
    function reduceAllow (acc, v) { acc[v] = true; return acc }
    const allowedSels = ['okTurtles.events/on', 'chelonia/defineContract', 'chelonia/out/keyRequest']
      .concat(this.config.contracts.defaults.allowedSelectors)
      .reduce(reduceAllow, {})
    const allowedDoms = this.config.contracts.defaults.allowedDomains
      .reduce(reduceAllow, {})
    let contractName: string // eslint-disable-line prefer-const
    const contractSBP = (selector: string, ...args) => {
      const domain = domainFromSelector(selector)
      if (selector.startsWith(contractName)) {
        selector = `${manifestHash}/${selector}`
      }
      if (allowedSels[selector] || allowedDoms[domain]) {
        return sbp(selector, ...args)
      } else {
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
      ...this.config.contracts.defaults.exposedGlobals,
      require: (dep) => {
        return dep === '@sbp/sbp'
          ? contractSBP
          : this.config.contracts.defaults.modules[dep]
      },
      sbp: contractSBP,
      fetchServerTime: () => {
        // If contracts need the current timestamp (for example, for metadata 'createdDate')
        // they must call this function so that clients are kept synchronized to the server's
        // clock, for consistency, so that if one client's clock is off, it doesn't conflict
        // with other client's clocks.
        // See: https://github.com/okTurtles/group-income/issues/531
        return fetch(`${this.config.connectionURL}/time`).then(handleFetchResult('text'))
      }
    })
    contractName = this.defContract.name
    this.defContractSelectors.forEach(s => { allowedSels[s] = true })
    this.manifestToContract[manifestHash] = {
      slim: contractInfo === body.contractSlim,
      info: contractInfo,
      contract: this.defContract
    }
  },
  // used by, e.g. 'chelonia/contract/wait'
  'chelonia/private/noop': function () {},
  'chelonia/private/withEnv': async function (env: Object, sbpInvocation: Array<*>) {
    const savedEnv = this.env
    this.env = env
    try {
      return await sbp(...sbpInvocation)
    } finally {
      this.env = savedEnv
    }
  },
  'chelonia/private/out/publishEvent': async function (entry: GIMessage, { maxAttempts = 5 } = {}) {
    let attempt = 1
    // auto resend after short random delay
    // https://github.com/okTurtles/group-income/issues/608
    while (true) {
      const r = await fetch(`${this.config.connectionURL}/event`, {
        method: 'POST',
        body: entry.serialize(),
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': 'gi TODO - signature - if needed here - goes here'
        }
      })
      if (r.ok) {
        return entry
      }
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
        // if this isn't OP_CONTRACT, recreate and resend message
        if (!entry.isFirstMessage()) {
          const rootState = sbp(this.config.stateSelector)
          const newEntry = await recreateEvent(entry, rootState)
          if (!newEntry) {
            return
          }
          entry = newEntry
        }
      } else {
        const message = (await r.json())?.message
        console.error(`[chelonia] ERROR: failed to publish ${entry.description()}: ${r.status} - ${r.statusText}: ${message}`, entry)
        throw new Error(`publishEvent: ${r.status} - ${r.statusText}: ${message}`)
      }
    }
  },
  'chelonia/private/out/latestHEADinfo': function (contractID: string) {
    return fetch(`${this.config.connectionURL}/latestHEADinfo/${contractID}`, {
      cache: 'no-store'
    }).then(handleFetchResult('json'))
  },
  // TODO: r.body is a stream.Transform, should we use a callback to process
  //       the events one-by-one instead of converting to giant json object?
  //       however, note if we do that they would be processed in reverse...
  'chelonia/private/out/eventsAfter': async function (contractID: string, since: string) {
    const events = await fetch(`${this.config.connectionURL}/eventsAfter/${contractID}/${since}`)
      .then(handleFetchResult('json'))
    if (Array.isArray(events)) {
      return events.reverse().map(b64ToStr)
    }
  },
  'chelonia/private/in/processMessage': async function (message: GIMessage, state: Object, internalSideEffectStack?: any[]) {
    const [opT, opV] = message.op()
    const hash = message.hash()
    const id = message.id()
    const height = message.height()
    const contractID = message.contractID()
    const manifestHash = message.manifest()
    const signingKeyId = message.signingKeyId()
    const config = this.config
    const env = this.env
    const self = this
    const opName = Object.entries(GIMessage).find(([x, y]) => y === opT)?.[0]
    console.debug('PROCESSING OPCODE:', opName, 'from', message.originatingContractID(), 'to', contractID)
    if (!state._vm) config.reactiveSet(state, '_vm', Object.create(null))
    const opFns: { [GIOpType]: (any) => void } = {
      [GIMessage.OP_ATOMIC] (v: GIOpAtomic) {
        v.forEach((u) => opFns[u[0]](u[1]))
      },
      [GIMessage.OP_CONTRACT] (v: GIOpContract) {
        state._vm.type = v.type
        const keys = keysToMap(v.keys, height)
        config.reactiveSet(state._vm, 'authorizedKeys', keys)
        // Loop through the keys in the contract and try to decrypt all of the private keys
        // Example: in the identity contract you have the IEK, IPK, CSK, and CEK.
        // When you login you have the IEK which is derived from your password, and you
        // will use it to decrypt the rest of the keys which are encrypted with that.
        // Specifically, the IEK is used to decrypt the CSKs and the CEKs, which are
        // the encrypted versions of the CSK and CEK.
        keyAdditionProcessor.call(self, v.keys, state, contractID, signingKey)
      },
      [GIMessage.OP_ACTION_ENCRYPTED] (v: GIOpActionEncrypted) {
        if (!config.skipActionProcessing && !env.skipActionProcessing) {
          opFns[GIMessage.OP_ACTION_UNENCRYPTED](message.opValue().valueOf())
          console.log('OP_ACTION_ENCRYPTED: decrypted')
        }
        console.log('OP_ACTION_ENCRYPTED: skipped action processing')
      },
      [GIMessage.OP_ACTION_UNENCRYPTED] (v: GIOpActionUnencrypted) {
        if (!config.skipActionProcessing && !env.skipActionProcessing) {
          let innerSigningKeyId: string | typeof undefined
          if (isSignedData(v)) {
            innerSigningKeyId = (v: any).signingKeyId
            v = (v: any).valueOf()
          }

          // TODO: Verify signing permissions

          const { data, meta, action } = (v: any)

          if (!config.whitelisted(action)) {
            throw new Error(`chelonia: action not whitelisted: '${action}'`)
          }

          sbp(
            `${manifestHash}/${action}/process`,
            {
              data,
              meta,
              hash,
              id,
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
      [GIMessage.OP_KEY_SHARE] (wv: GIOpKeyShare) {
        console.log('Processing OP_KEY_SHARE')
        // TODO: Prompt to user if contract not in pending

        const data = unwrapMaybeEncryptedData(wv)
        console.log('@@@@@GIMessage.OP_KEY_SHARE', { data })
        if (!data) return
        const v = (data.data: ProtoGIOpKeyShare)

        delete self.postSyncOperations[contractID]?.['pending-keys-for-' + v.contractID]

        const cheloniaState = sbp(self.config.stateSelector)

        if (!cheloniaState[v.contractID]) {
          config.reactiveSet(cheloniaState, v.contractID, Object.create(null))
        }
        let targetState = cheloniaState[v.contractID]
        let newestEncryptionKeyHeight = Number.POSITIVE_INFINITY
        console.log('@@@@@GIMessage.OP_KEY_SHARE', { keys: v.keys })
        for (const key of v.keys) {
          if (key.meta?.private) {
            if (
              key.id &&
              key.meta.private.content &&
              !sbp('chelonia/haveSecretKey', key.id, !key.meta.private.transient)
            ) {
              try {
                const decrypted = key.meta.private.content.valueOf()
                sbp('chelonia/storeSecretKeys', [{
                  key: deserializeKey(decrypted),
                  transient: !!key.meta.private.transient
                }])
                if (
                  targetState._vm?.authorizedKeys?.[key.id]?._notBeforeHeight != null &&
                    Array.isArray(targetState._vm.authorizedKeys[key.id].purpose) &&
                    targetState._vm.authorizedKeys[key.id].purpose.includes('enc')
                ) {
                  newestEncryptionKeyHeight = Math.min(newestEncryptionKeyHeight, targetState._vm.authorizedKeys[key.id]._notBeforeHeight)
                }
              } catch (e) {
                if (e?.name === 'ChelErrorDecryptionKeyNotFound') {
                  console.warn(`OP_KEY_SHARE missing secret key: ${e.message}`,
                    e)
                } else {
                  console.error(`OP_KEY_SHARE error '${e.message || e}':`,
                    e)
                }
              }
            }
          }
        }

        internalSideEffectStack?.push(async () => {
          console.log('Processing OP_KEY_SHARE (inside promise)')
          // If an encryption key has been shared with _notBefore lower than the
          // current height, then the contract must be resynced.
          if (newestEncryptionKeyHeight < cheloniaState.contracts[v.contractID]?.height) {
            if (!Object.keys(targetState).some((k) => k !== '_volatile')) {
              // If the contract only has _volatile state, we don't force sync it
              return
            }
            const previousVolatileState = targetState._volatile

            console.log('Inside pendingKeyRequests if')
            // Since we have received new keys, the current contract state might be wrong, so we need to remove the contract and resync
            await sbp('chelonia/contract/remove', v.contractID)
            // Sync...
            self.setPostSyncOp(v.contractID, 'received-keys', ['okTurtles.events/emit', CONTRACT_HAS_RECEIVED_KEYS, { contractID: v.contractID }])

            // WARNING! THIS MIGHT DEADLOCK!!!
            await sbp('chelonia/withEnv', env, [
              'chelonia/private/in/syncContract', v.contractID
            ])

            targetState = cheloniaState[v.contractID]

            if (previousVolatileState && has(previousVolatileState, 'watch')) {
              if (!targetState._volatile) config.reactiveSet(targetState, '_volatile', Object.create(null))
              if (!targetState._volatile.watch) {
                config.reactiveSet(targetState._volatile, 'watch', previousVolatileState.watch)
              } else {
                targetState._volatile.watch.push(...previousVolatileState.watch)
              }
            }
          } else {
            sbp('okTurtles.events/emit', CONTRACT_HAS_RECEIVED_KEYS, { contractID: v.contractID })
          }

          if (!Array.isArray(targetState._volatile?.pendingKeyRequests)) return

          config.reactiveSet(
            targetState._volatile, 'pendingKeyRequests',
            targetState._volatile.pendingKeyRequests.filter((pkr) =>
              pkr?.name !== signingKey.name
            )
          )
        })
      },
      [GIMessage.OP_KEY_REQUEST] (wv: GIOpKeyRequest) {
        const data = unwrapMaybeEncryptedData(wv)
        if (!data) return
        const v = data.data

        const originatingContractID = v.contractID

        if (state._vm?.invites?.[signingKeyId]?.quantity != null) {
          if (state._vm.invites[signingKeyId].quantity > 0) {
            if ((--state._vm.invites[signingKeyId].quantity) <= 0) {
              state._vm.invites[signingKeyId].status = INVITE_STATUS.USED
            }
          } else {
            console.error('Ignoring OP_KEY_REQUEST because it exceeds allowed quantity: ' + originatingContractID)
            return
          }
        }

        if (state._vm?.invites?.[signingKeyId]?.expires != null) {
          if (state._vm.invites[signingKeyId].expires < Date.now()) {
            console.error('Ignoring OP_KEY_REQUEST because it expired at ' + state._vm.invites[signingKeyId].expires + ': ' + originatingContractID)
            return
          }
        }

        if (config.skipActionProcessing || env.skipActionProcessing) {
          return
        }

        if (!has(v.replyWith, 'context')) {
          console.error('Ignoring OP_KEY_REQUEST because it is missing the context attribute')
          return
        }

        const context = v.replyWith.context

        if (context?.[0] !== originatingContractID) {
          console.error('Ignoring OP_KEY_REQUEST because it is signed by the wrong contract')
          return
        }

        if (!state._vm.pendingKeyshares) config.reactiveSet(state._vm, 'pendingKeyshares', Object.create(null))

        config.reactiveSet(state._vm.pendingKeyshares, message.hash(), [
          !!data.encryptionKeyId,
          message.height(),
          signingKeyId,
          context
        ])

        // Call 'chelonia/private/respondToKeyRequests' after sync
        self.setPostSyncOp(contractID, 'respondToKeyRequests-' + message.contractID(), ['chelonia/private/respondToKeyRequests', contractID])
      },
      [GIMessage.OP_KEY_REQUEST_SEEN] (wv: GIOpKeyRequestSeen) {
        if (config.skipActionProcessing || env.skipActionProcessing) {
          return
        }
        // TODO: Handle boolean (success) value

        const data = unwrapMaybeEncryptedData(wv)
        if (!data) return
        const v = (data.data: ProtoGIOpKeyRequestSeen)

        if (state._vm.pendingKeyshares && v.keyRequestHash in state._vm.pendingKeyshares) {
          const hash = v.keyRequestHash
          const keyId = state._vm.pendingKeyshares[hash][2]
          const originatingContractID = state._vm.pendingKeyshares[hash][3][0]
          if (Array.isArray(state._vm?.invites?.[keyId]?.responses)) {
            state._vm?.invites?.[keyId]?.responses.push(originatingContractID)
          }
          delete state._vm.pendingKeyshares[hash]
          delete self.postSyncOperations[contractID]?.['respondToKeyRequests-' + originatingContractID]
        }
      },
      [GIMessage.OP_PROP_DEL]: notImplemented,
      [GIMessage.OP_PROP_SET] (v: GIOpPropSet) {
        if (!state._vm.props) state._vm.props = {}
        state._vm.props[v.key] = v.value
      },
      [GIMessage.OP_KEY_ADD] (v: GIOpKeyAdd) {
        const keys = keysToMap(v, height, state._vm.authorizedKeys)
        const keysArray = ((Object.values(v): any): GIKey[])
        keysArray.forEach((k) => {
          if (has(state._vm.authorizedKeys, k.id) && state._vm.authorizedKeys[k.id]._notAfterHeight == null) {
            throw new Error('Cannot use OP_KEY_ADD on existing keys. Key ID: ' + k.id)
          }
        })
        validateKeyAddPermissions(contractID, signingKey, state, v)
        config.reactiveSet(state._vm, 'authorizedKeys', { ...state._vm.authorizedKeys, ...keys })
        keyAdditionProcessor.call(self, v, state, contractID, signingKey)
      },
      [GIMessage.OP_KEY_DEL] (v: GIOpKeyDel) {
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

          const rootState = sbp(config.stateSelector)

          // Are we deleting a foreign key? If so, we also need to remove
          // the operation from (1) _volatile.watch (on the other contract)
          // and (2) postSyncOperations
          if (key.foreignKey) {
            const fkUrl = new URL(key.foreignKey)
            const foreignContract = fkUrl.pathname
            const foreignKeyName = fkUrl.searchParams.get('keyName')

            if (!foreignContract || !foreignKeyName) throw new Error('Invalid foreign key: missing contract or key name')

            if (Array.isArray(rootState[foreignContract]?._volatile?.watch)) {
              // Stop watching events for this key
              rootState[foreignContract]._volatile.watch = rootState[foreignContract]._volatile.watch.filter(([name, cID]) => name !== foreignKeyName || cID !== contractID)
            }

            delete self.postSyncOperations?.[contractID][`syncAndMirrorKeys-${foreignContract}-${encodeURIComponent(foreignKeyName)}`]
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

          keyRotationHelper(contractID, state, config, updatedKeysMap, [GIMessage.OP_KEY_DEL], 'chelonia/out/keyDel', (name) => updatedKeysMap[name[0]].oldKeyId, internalSideEffectStack)
        }
      },
      [GIMessage.OP_KEY_UPDATE] (v: GIOpKeyUpdate) {
        if (!state._volatile) config.reactiveSet(state, '_volatile', Object.create(null))
        if (!state._volatile.pendingKeyRevocations) config.reactiveSet(state._volatile, 'pendingKeyRevocations', Object.create(null))
        const [updatedKeys, keysToDelete] = validateKeyUpdatePermissions(contractID, signingKey, state, v)
        for (const keyId of keysToDelete) {
          if (has(state._volatile.pendingKeyRevocations, keyId)) {
            delete state._volatile.pendingKeyRevocations[keyId]
          }

          config.reactiveSet(state._vm.authorizedKeys[keyId], '_notAfterHeight', height)
        }
        for (const key of updatedKeys) {
          if (!has(state._vm.authorizedKeys, key.id)) {
            key._notBeforeHeight = height
          }
          config.reactiveSet(state._vm.authorizedKeys, key.id, cloneDeep(key))
        }
        keyAdditionProcessor.call(self, (updatedKeys: any), state, contractID, signingKey)

        // Check state._volatile.watch for contracts that should be
        // mirroring this operation
        if (Array.isArray(state._volatile?.watch)) {
          const updatedKeysMap = Object.create(null)

          updatedKeys.forEach((key) => {
            if (key.data) updatedKeysMap[key.name] = key
          })

          keyRotationHelper(contractID, state, config, updatedKeysMap, [GIMessage.OP_KEY_UPDATE], 'chelonia/out/keyUpdate', (name) => ({
            name: name[1],
            oldKeyId: updatedKeysMap[name[0]].oldKeyId,
            id: updatedKeysMap[name[0]].id,
            data: updatedKeysMap[name[0]].data
          }), internalSideEffectStack)
        }
      },
      [GIMessage.OP_PROTOCOL_UPGRADE]: notImplemented
    }
    if (!this.manifestToContract[manifestHash]) {
      await sbp('chelonia/private/loadManifest', manifestHash)
    }
    let processOp = true
    if (config.preOp) {
      processOp = config.preOp(message, state) !== false && processOp
    }

    let signingKey: GIKey
    // Signature verification
    {
      // This sync code has potential issues
      // The first issue is that it can deadlock if there are circular references
      // The second issue is that it doesn't handle key rotation. If the key used for signing is invalidated / removed from the originating contract, we won't have it in the state
      // Both of these issues can be resolved by introducing a parameter with the message ID the state is based on. This requires implementing a separate, ephemeral, state container for operations that refer to a different contract.
      // The difficulty of this is how to securely determine the message ID to use.
      // The server can assist with this.

      const stateForValidation = opT === GIMessage.OP_CONTRACT && !state?._vm?.authorizedKeys
        ? {
            _vm: {
              authorizedKeys: keysToMap(((opV: any): GIOpContract).keys, height)
            }
          }
        : state

      // Verify that the signing key is found, has the correct purpose and is
      // allowed to sign this particular operation
      if (!validateKeyPermissions(stateForValidation, signingKeyId, opT, opV)) {
        throw new Error('No matching signing key was defined')
      }

      signingKey = stateForValidation._vm.authorizedKeys[signingKeyId]
    }

    if (config[`preOp_${opT}`]) {
      processOp = config[`preOp_${opT}`](message, state) !== false && processOp
    }
    if (processOp) {
      opFns[opT](opV)
      config.postOp?.(message, state)
      config[`postOp_${opT}`]?.(message, state) // hack to fix syntax highlighting `
    }
  },
  'chelonia/private/in/enqueueHandleEvent': async function (event: GIMessage) {
    // make sure handleEvent is called AFTER any currently-running invocations
    // to 'chelonia/contract/sync', to prevent gi.db from throwing
    // "bad previousHEAD" errors
    const result = await sbp('okTurtles.eventQueue/queueEvent', event.contractID(), [
      'chelonia/private/in/handleEvent', event
    ])
    return result
  },
  'chelonia/private/in/syncContract': async function (contractID: string) {
    const state = sbp(this.config.stateSelector)
    const { HEAD: latest } = await sbp('chelonia/out/latestHEADInfo', contractID)
    console.debug(`[chelonia] syncContract: ${contractID} latestHash is: ${latest}`)
    // there is a chance two users are logged in to the same machine and must check their contracts before syncing
    let recent
    if (state.contracts[contractID]) {
      recent = state.contracts[contractID].HEAD
    } else if (!state.pending.includes(contractID)) {
      // we're syncing a contract for the first time, make sure to add to pending
      // so that handleEvents knows to expect events from this contract
      state.pending.push(contractID)
    }
    sbp('okTurtles.events/emit', CONTRACT_IS_SYNCING, contractID, true)
    this.currentSyncs[contractID] = { firstSync: !state.contracts[contractID] }
    this.postSyncOperations[contractID] = this.postSyncOperations[contractID] ?? Object.create(null)
    try {
      if (latest !== recent) {
        console.debug(`[chelonia] Synchronizing Contract ${contractID}: our recent was ${recent || 'undefined'} but the latest is ${latest}`)
        // TODO: fetch events from localStorage instead of server if we have them
        const events = await sbp('chelonia/out/eventsAfter', contractID, recent || contractID)
        // Sanity check: verify event with latest hash exists in list of events
        // TODO: using findLastIndex, it will be more clean but it needs Cypress 9.7+ which has bad performance
        //       https://docs.cypress.io/guides/references/changelog#9-7-0
        //       https://github.com/cypress-io/cypress/issues/22868
        let latestHashFound = false
        for (let i = events.length - 1; i >= 0; i--) {
          if (GIMessage.deserialize(events[i], this.transientSecretKeys).hash() === latest) {
            latestHashFound = true
            break
          }
        }
        if (!latestHashFound) {
          throw new ChelErrorUnrecoverable(`expected hash ${latest} in list of events for contract ${contractID}`)
        }
        // remove the first element in cases where we are not getting the contract for the first time
        state.contracts[contractID] && events.shift()
        for (let i = 0; i < events.length; i++) {
          // this must be called directly, instead of via enqueueHandleEvent
          await sbp('chelonia/private/in/handleEvent', GIMessage.deserialize(events[i], this.transientSecretKeys))
        }
      } else {
        console.debug(`[chelonia] contract ${contractID} was already synchronized`)
      }

      // The postSyncOperations might await on calls to withEnv or queue event, leading to a deadlock. Therefore, we specifically and deliberately don't await on these calls
      Object.values(this.postSyncOperations[contractID]).map(async (op) => {
        try {
          await sbp.apply(sbp, op)
        } catch (e) {
          console.error(`Post-sync operation for ${contractID} failed`, { contractID, op, error: e })
        }
      })
    } catch (e) {
      console.error(`[chelonia] syncContract error: ${e.message || e}`, e)
      this.config.hooks.syncContractError?.(e, contractID)
      throw e
    } finally {
      delete this.currentSyncs[contractID]
      this.postSyncOperations[contractID] = Object.create(null)
      sbp('okTurtles.events/emit', CONTRACT_IS_SYNCING, contractID, false)
    }
  },
  'chelonia/private/in/syncContractAndWatchKeys': async function (contractID: string, keyName: string, externalContractID: string, keyId: string) {
    const state = sbp(this.config.stateSelector)
    const externalContractState = state[externalContractID]

    const signingKey = findSuitableSecretKeyId(externalContractState, [GIMessage.OP_KEY_DEL], ['sig'], externalContractState._vm.authorizedKeys[keyId].ringLevel)
    const canMirrorOperations = !!signingKey

    // Only sync contract if we are actually able to mirror key operations
    // This avoids exponentially growing the number of contracts that we need
    // to be subscribed to.
    // Otherwise, every time there is a foreign key, we would subscribe to that
    // contract, plus the contracts referenced by the foreign keys of that
    // contract, plus those contracts referenced by the foreign keys of those
    // other contracts and so on.
    if (!canMirrorOperations) {
      console.info('[chelonia/private/in/syncContractAndWatchKeys]: Returning as operations cannot be mirrored', { contractID, keyName, externalContractID, keyId })
      return
    }

    await sbp('chelonia/contract/sync', contractID)

    const contractState = state[contractID]

    // Does the key exist? If not, it has probably been removed and instead
    // of waiting, we need to remove it ourselves
    if (contractState._vm?.authorizedKeys && !Object.values(contractState._vm.authorizedKeys).find((k) => ((k: any): GIKey).name === keyName)) {
      const signingKeyId = findSuitableSecretKeyId(state[externalContractID], [GIMessage.OP_KEY_DEL], ['sig'], state[externalContractID]._vm?.authorizedKeys?.[keyId].ringLevel)
      const externalContractName = state.contracts[externalContractID]?.type

      if (externalContractName && signingKeyId) {
        sbp('chelonia/out/keyDel', { contractID: externalContractID, contractName: externalContractName, data: [keyId], signingKeyId })
      }
    }

    // Add keys to watchlist as another contract is waiting on these
    // operations
    if (!contractState._volatile) {
      this.config.reactiveSet(contractState, '_volatile', Object.create(null, { watch: { value: [[keyName, externalContractID]], configurable: true, enumerable: true, writable: true } }))
    } else {
      if (!contractState._volatile.watch) this.config.reactiveSet(contractState._volatile, 'watch', [[keyName, externalContractID]])
      if (Array.isArray(contractState._volatile.watch) && !contractState._volatile.watch.find((v) => v[0] === keyName && v[1] === externalContractID)) contractState._volatile.watch.push([keyName, externalContractID])
    }
  },
  'chelonia/private/respondToKeyRequests': async function (contractID: string) {
    const state = sbp(this.config.stateSelector)
    const contractState = state[contractID] ?? {}

    console.log('pendingKeyshares', contractState._vm.pendingKeyshares)

    if (!contractState._vm || !contractState._vm.pendingKeyshares) {
      return
    }

    const pending = contractState._vm.pendingKeyshares

    delete contractState._vm.pendingKeyshares

    const signingKeyId = findSuitableSecretKeyId(contractState, [GIMessage.OP_ATOMIC, GIMessage.OP_KEY_REQUEST_SEEN, GIMessage.OP_KEY_SHARE], ['sig'])

    if (!signingKeyId) {
      console.log('Unable to respond to key request because there is no suitable secret key with OP_KEY_REQUEST_SEEN permission')
      return
    }

    await Promise.all(Object.entries(pending).map(async ([hash, entry]) => {
      if (!Array.isArray(entry) || entry.length !== 4) {
        return
      }

      const [fullEncryption, height, , [originatingContractID, rv, originatingContractHeight, headJSON]] = ((entry: any): [boolean, number, string, [string, Object, number, string]])

      // 1. Sync (originating) identity contract

      await sbp('chelonia/withEnv', { skipActionProcessing: true }, [
        'chelonia/contract/sync', originatingContractID
      ])

      const originatingState = state[originatingContractID]
      const contractName = state.contracts[contractID].type
      const originatingContractName = originatingState._vm.type

      const v = signedIncomingData(originatingContractID, originatingState, rv, originatingContractHeight, headJSON).valueOf()

      try {
        // 2. Verify 'data'
        const { encryptionKeyId } = v

        const responseKey = encryptedIncomingData(contractID, contractState, v.responseKey, height, this.secretKeys, headJSON).valueOf()

        const deserializedResponseKey = deserializeKey(responseKey)

        sbp('chelonia/storeSecretKeys', { key: deserializedResponseKey })

        const keys = pick(
          state['secretKeys'],
          Object.entries(contractState._vm.authorizedKeys)
            .filter(([, key]) => !!(key: any).meta?.private?.shareable)
            .map(([kId]) => kId)
        )

        if (!keys || Object.keys(keys).length === 0) {
          console.info('respondToKeyRequests: no keys to share', { contractID, originatingContractID })
          return
        }

        // 3. Send OP_KEY_SHARE to identity contract
        await sbp('chelonia/out/keyShare', {
          contractID: originatingContractID,
          contractName: originatingContractName,
          data: {
            contractID: contractID,
            keys: Object.entries(keys).map(([keyId, key]: [string, mixed]) => ({
              id: keyId,
              meta: {
                private: {
                  content: encryptedOutgoingData(originatingState, encryptionKeyId, key),
                  shareable: true
                }
              }
            }))
          },
          signingKey: deserializedResponseKey
        })

        // 4(i). Remove originating contract and update current contract with information
        const payload = { keyRequestHash: hash, success: true }
        await sbp('chelonia/out/atomic', {
          contractID,
          contractName,
          signingKeyId,
          data: [
            [
              'chelonia/out/keyRequestResponse',
              {
                data:
                  fullEncryption
                    ? encryptedOutgoingData(
                      contractState,
                      findSuitablePublicKeyIds(contractState, [GIMessage.OP_KEY_REQUEST_SEEN], ['enc'])?.[0] || '',
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
                data: {
                  contractID: originatingContractID,
                  keys: [
                    {
                      id: keyId(deserializedResponseKey),
                      meta: {
                        private: {
                          content: encryptedOutgoingData(contractState, findSuitablePublicKeyIds(contractState, [GIMessage.OP_KEY_REQUEST_SEEN], ['enc'])?.[0] || '', responseKey),
                          shareable: true
                        }
                      }
                    }
                  ]
                }
              }
            ]
          ]
        })
      } catch (e) {
        console.error('Error at respondToKeyRequests', e)
        const payload = { keyRequestHash: hash, success: false }

        // 4(ii). Remove originating contract and update current contract with information
        await sbp('chelonia/out/keyRequestResponse', {
          contractID,
          contractName,
          signingKeyId,
          data: fullEncryption
            ? encryptedOutgoingData(contractState, findSuitablePublicKeyIds(contractState, [GIMessage.OP_KEY_REQUEST_SEEN], ['enc'])?.[0] || '', payload)
            : payload
        })
      }
    }))
  },
  'chelonia/private/in/handleEvent': async function (message: GIMessage) {
    const state = sbp(this.config.stateSelector)
    const contractID = message.contractID()
    const hash = message.hash()
    const height = message.height()
    const { preHandleEvent, postHandleEvent, handleEventError } = this.config.hooks
    let processingErrored = false
    // Errors in mutations result in ignored messages
    // Errors in side effects result in dropped messages to be reprocessed
    try {
      await preHandleEvent?.(message)
      // verify we're expecting to hear from this contract
      if (!state.pending.includes(contractID) && !state.contracts[contractID]) {
        console.warn(`[chelonia] WARN: ignoring unexpected event ${message.description()}:`, message.serialize())
        return
      }
      // the order the following actions are done is critically important!
      // first we make sure we save this message to the db
      // if an exception is thrown here we do not need to revert the state
      // because nothing has been processed yet
      const proceed = await handleEvent.addMessageToDB(message)
      if (proceed === false) return

      const internalSideEffectStack = !this.config.skipSideEffects && !this.env.skipSideEffects ? [] : undefined

      const contractStateCopy = cloneDeep(state[contractID] || null)
      // process the mutation on the state
      // IMPORTANT: even though we 'await' processMutation, everything in your
      //            contract's 'process' function must be synchronous! The only
      //            reason we 'await' here is to dynamically load any new contract
      //            source / definitions specified by the GIMessage
      try {
        await handleEvent.processMutation.call(this, message, state, internalSideEffectStack)
      } catch (e) {
        if (e?.name === 'ChelErrorDecryptionKeyNotFound') {
          console.warn(`[chelonia] WARN '${e.name}' in processMutation for ${message.description()}: ${e.message}`, e, message.serialize())
        } else {
          console.error(`[chelonia] ERROR '${e.name}' in processMutation for ${message.description()}: ${e.message || e}`, e, message.serialize())
        }
        // we revert any changes to the contract state that occurred, ignoring this mutation
        handleEvent.revertProcess.call(this, { message, state, contractID, contractStateCopy })
        processingErrored = true
        this.config.hooks.processError?.(e, message)
        // special error that prevents the head from being updated, effectively killing the contract
        if (e.name === 'ChelErrorUnrecoverable') throw e
      }
      // whether or not there was an exception, we proceed ahead with updating the head
      // you can prevent this by throwing an exception in the processError hook
      /* if (!state.contracts[contractID]) {
        state.contracts[contractID] = Object.create(null)
      } */
      if (state.contracts[contractID]) {
        state.contracts[contractID].HEAD = hash
        state.contracts[contractID].height = height
      }
      // process any side-effects (these must never result in any mutation to the contract state!)
      if (!processingErrored) {
        try {
          // Gets run get when skipSideEffects is false
          if (internalSideEffectStack) {
            // The 'await' here might cause deadlocks, since these internal side
            // effects mostly interact with other contracts, which may cause
            // dependency loops. It seems to be fine now, but if it causes
            // issues, it should be removed or addressed some other way
            await Promise.all(internalSideEffectStack.map(fn => fn()))
          }
        } catch (e) {
          console.error(`[chelonia] ERROR '${e.name}' in internal side effect for ${message.description()}: ${e.message}`, e, { message: message.serialize() })
        }
        try {
          if (!this.config.skipActionProcessing && !this.config.skipSideEffects && !this.env.skipActionProcessing && !this.env.skipSideEffects) {
            await handleEvent.processSideEffects.call(this, message, state[contractID])
          }
        } catch (e) {
          console.error(`[chelonia] ERROR '${e.name}' in sideEffect for ${message.description()}: ${e.message}`, e, { message: message.serialize() })
          // We used to revert the state and rethrow the error here, but we no longer do that
          // see this issue for why: https://github.com/okTurtles/group-income/issues/1544
          this.config.hooks.sideEffectError?.(e, message)
        }
        try {
          await postHandleEvent?.(message)
          sbp('okTurtles.events/emit', hash, contractID, message)
          sbp('okTurtles.events/emit', EVENT_HANDLED, contractID, message)
        } catch (e) {
          console.error(`[chelonia] ERROR '${e.name}' for ${message.description()} in event post-handling: ${e.message}`, e, { message: message.serialize() })
        }
      }
    } catch (e) {
      console.error(`[chelonia] ERROR in handleEvent: ${e.message || e}`, e)
      try {
        handleEventError?.(e, message)
      } catch (e2) {
        console.error('[chelonia] Ignoring user error in handleEventError hook:', e2)
      }
      throw e
    }
  }
}): string[])

const eventsToReinjest = []
const reprocessDebounced = debounce((contractID) => sbp('chelonia/contract/sync', contractID), 1000)

const handleEvent = {
  async addMessageToDB (message: GIMessage) {
    const contractID = message.contractID()
    const hash = message.hash()
    try {
      await sbp('chelonia/db/addEntry', message)
      const reprocessIdx = eventsToReinjest.indexOf(hash)
      if (reprocessIdx !== -1) {
        console.warn(`[chelonia] WARN: successfully reinjested ${message.description()}`)
        eventsToReinjest.splice(reprocessIdx, 1)
      }
    } catch (e) {
      if (e.name === 'ChelErrorDBBadPreviousHEAD') {
        // sometimes we simply miss messages, it's not clear why, but it happens
        // in rare cases. So we attempt to re-sync this contract once
        if (eventsToReinjest.length > 100) {
          throw new ChelErrorUnrecoverable('more than 100 different bad previousHEAD errors')
        }
        if (!eventsToReinjest.includes(hash)) {
          console.warn(`[chelonia] WARN bad previousHEAD for ${message.description()}, will attempt to re-sync contract to reinjest message`)
          eventsToReinjest.push(hash)
          reprocessDebounced(contractID)
          return false // ignore the error for now
        } else {
          console.error(`[chelonia] ERROR already attempted to reinjest ${message.description()}, will not attempt again!`)
        }
      }
      throw e
    }
  },
  async processMutation (message: GIMessage, state: Object, internalSideEffectStack?: any[]) {
    const contractID = message.contractID()
    if (message.isFirstMessage()) {
      // Flow doesn't understand that a first message must be a contract,
      // so we have to help it a bit in order to acces the 'type' property.
      const { type } = ((message.opValue(): any): GIOpContract)
      // Allow having _volatile but nothing else
      if (state[contractID] && Object.keys(state[contractID]).length > 0 && !('_volatile' in state[contractID])) {
        throw new ChelErrorUnrecoverable(`state[contractID] (contractID ${contractID}) is already set`)
      }
      console.debug(`contract ${type} registered for ${contractID}`)
      if (!state[contractID]) this.config.reactiveSet(state, contractID, Object.create(null))
      this.config.reactiveSet(state.contracts, contractID, { type, HEAD: contractID, height: 0 })
      // we've successfully received it back, so remove it from expectation pending
      const index = state.pending.indexOf(contractID)
      index !== -1 && state.pending.splice(index, 1)
      sbp('okTurtles.events/emit', CONTRACTS_MODIFIED, state.contracts)
    }
    await sbp('chelonia/private/in/processMessage', message, state[contractID], internalSideEffectStack)

    // call contract sync again if we get a key request, so that we can respond to any unhandled key requests.
    if (!sbp('chelonia/contract/isSyncing', contractID) && [GIMessage.OP_KEY_ADD, GIMessage.OP_KEY_REQUEST].includes(message.opType())) {
      sbp('chelonia/contract/sync', contractID)
    }
  },
  async processSideEffects (message: GIMessage, state: Object) {
    const opT = message.opType()
    if ([GIMessage.OP_ATOMIC, GIMessage.OP_ACTION_ENCRYPTED, GIMessage.OP_ACTION_UNENCRYPTED].includes(opT)) {
      const contractID = message.contractID()
      const manifestHash = message.manifest()
      const hash = message.hash()
      const id = message.id()
      const signingKeyId = message.signingKeyId()
      const callSideEffect = (field) => {
        let v = field.valueOf()
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
          id,
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
        return sbp(`${manifestHash}/${action}/sideEffect`, mutation)
      }
      const msg = Object(message.message())

      if (opT !== GIMessage.OP_ATOMIC) {
        return await callSideEffect(msg)
      }

      const reducer = (acc, [opT, opV]) => {
        if ([GIMessage.OP_ACTION_ENCRYPTED, GIMessage.OP_ACTION_UNENCRYPTED].includes(opT)) {
          acc.push(Object(opV))
        }
        return acc
      }

      const actionsOpV = ((msg: any): GIOpAtomic).reduce(reducer, [])
      for (let i = 0; i < actionsOpV.length; i++) {
        await callSideEffect(actionsOpV[i])
      }
    }
  },
  revertProcess ({ message, state, contractID, contractStateCopy }) {
    console.warn(`[chelonia] reverting mutation ${message.description()}: ${message.serialize()}. Any side effects will be skipped!`)
    if (!contractStateCopy) {
      console.warn(`[chelonia] mutation reversion on very first message for contract ${contractID}! Your contract may be too damaged to be useful and should be redeployed with bugfixes.`)
      contractStateCopy = {}
    }
    this.config.reactiveSet(state, contractID, contractStateCopy)
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
        const source = await fetch(moduleSpecifier).then(handleFetchResult('text'))
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
