'use strict'

import sbp, { domainFromSelector } from '@sbp/sbp'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'
import { cloneDeep, debounce, delay, randomIntFromRange } from '~/frontend/model/contracts/shared/giLodash.js'
import { b64ToStr, blake32Hash } from '~/shared/functions.js'
import { decrypt, encrypt, verifySignature } from './crypto.js'
import './db.js'
import { ChelErrorUnexpected, ChelErrorUnrecoverable } from './errors.js'
import { CONTRACTS_MODIFIED, CONTRACT_HAS_RECEIVED_KEYS, CONTRACT_IS_SYNCING, EVENT_HANDLED } from './events.js'
import type { GIKey, GIOpActionEncrypted, GIOpActionUnencrypted, GIOpContract, GIOpKeyAdd, GIOpKeyDel, GIOpKeyRequest, GIOpKeyRequestSeen, GIOpKeyShare, GIOpPropSet, GIOpType } from './GIMessage.js'
import { GIMessage } from './GIMessage.js'
import { findSuitableSecretKeyId, keyAdditionProcessor, validateKeyAddPermissions, validateKeyDelPermissions } from './utils.js'
// import 'ses'

const keysToMap = (keys: GIKey[]): Object => {
  return Object.fromEntries(keys.map(key => [key.id, key]))
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
      console,
      Object,
      Error,
      TypeError,
      Math,
      Symbol,
      Date,
      Array,
      // $FlowFixMe
      BigInt,
      Boolean,
      String,
      Number,
      Uint8Array,
      ArrayBuffer,
      JSON,
      RegExp,
      parseFloat,
      parseInt,
      Promise,
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
  'chelonia/private/out/publishEvent': async function (entry: GIMessage, { maxAttempts = 5 } = {}, signatureFn?: Function) {
    const contractID = entry.contractID()
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
        return r.text()
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
        await delay(randDelay) // wait half a second before sending it again
        // if this isn't OP_CONTRACT, get latestHash, recreate and resend message
        if (!entry.isFirstMessage()) {
          const previousHEAD = await sbp('chelonia/out/latestHash', contractID)
          entry = GIMessage.cloneWith(entry, { previousHEAD }, signatureFn)
        }
      } else {
        const message = (await r.json())?.message
        console.error(`[chelonia] ERROR: failed to publish ${entry.description()}: ${r.status} - ${r.statusText}: ${message}`, entry)
        throw new Error(`publishEvent: ${r.status} - ${r.statusText}: ${message}`)
      }
    }
  },
  'chelonia/private/out/latestHash': function (contractID: string) {
    return fetch(`${this.config.connectionURL}/latestHash/${contractID}`, {
      cache: 'no-store'
    }).then(handleFetchResult('text'))
  },
  // TODO: r.body is a stream.Transform, should we use a callback to process
  //       the events one-by-one instead of converting to giant json object?
  //       however, note if we do that they would be processed in reverse...
  'chelonia/private/out/eventsSince': async function (contractID: string, since: string) {
    const events = await fetch(`${this.config.connectionURL}/eventsSince/${contractID}/${since}`)
      .then(handleFetchResult('json'))
    if (Array.isArray(events)) {
      return events.reverse().map(b64ToStr)
    }
  },
  'chelonia/private/in/processMessage': async function (message: GIMessage, state: Object) {
    const [opT, opV] = message.op()
    const hash = message.hash()
    const id = message.id()
    const contractID = message.contractID()
    const manifestHash = message.manifest()
    const config = this.config
    const signature = message.signature()
    const signedPayload = message.signedPayload()
    const env = this.env
    const self = this
    const opName = Object.entries(GIMessage).find(([x, y]) => y === opT)?.[0]
    console.debug('PROCESSING OPCODE:', opName, 'from', message.originatingContractID(), 'to', contractID)
    if (!state._vm) state._vm = Object.create(null)
    const opFns: { [GIOpType]: (any) => void } = {
      [GIMessage.OP_CONTRACT] (v: GIOpContract) {
        const keys = { ...config.transientSecretKeys, ...state._volatile?.keys }
        state._vm.type = v.type
        config.reactiveSet(state._vm, 'authorizedKeys', keysToMap(v.keys))

        // Loop through the keys in the contract and try to decrypt all of the private keys
        // Example: in the identity contract you have the IEK, IPK, CSK, and CEK.
        // When you login you have the IEK which is derived from your password, and you
        // will use it to decrypt the rest of the keys which are encrypted with that.
        // Specifically, the IEK is used to decrypt the CSKs and the CEKs, which are
        // the encrypted versions of the CSK and CEK.
        keyAdditionProcessor.call(self, keys, v.keys, state, contractID)
      },
      [GIMessage.OP_ACTION_ENCRYPTED] (v: GIOpActionEncrypted) {
        if (!config.skipActionProcessing && !env.skipActionProcessing) {
          const decrypted = config.decryptFn.call(self, message.opValue(), state)
          message.decryptedValue(() => decrypted)
          opFns[GIMessage.OP_ACTION_UNENCRYPTED](decrypted)
          console.log('OP_ACTION_ENCRYPTED: decrypted')
        }
        console.log('OP_ACTION_ENCRYPTED: skipped action processing')
      },
      [GIMessage.OP_ACTION_UNENCRYPTED] (v: GIOpActionUnencrypted) {
        if (!config.skipActionProcessing && !env.skipActionProcessing) {
          const { data, meta, action } = v
          if (!config.whitelisted(action)) {
            throw new Error(`chelonia: action not whitelisted: '${action}'`)
          }
          sbp(`${manifestHash}/${action}/process`, { data, meta, hash, id, contractID }, state)
        }
      },
      [GIMessage.OP_KEY_SHARE] (v: GIOpKeyShare) {
        console.log('Processing OP_KEY_SHARE')
        // TODO: Prompt to user if contract not in pending
        if (message.originatingContractID() !== contractID && v.contractID !== message.originatingContractID()) {
          throw new Error('External contracts can only set keys for themselves')
        }

        delete self.postSyncOperations[contractID]?.['pending-keys-for-' + v.contractID]

        const cheloniaState = sbp(self.config.stateSelector)

        if (!cheloniaState[v.contractID]) {
          config.reactiveSet(cheloniaState, v.contractID, Object.create(null))
        }
        const targetState = cheloniaState[v.contractID]

        const keys = { ...config.transientSecretKeys, ...state._volatile?.keys }

        const sharedKeys = Object.create(null)

        for (const key of v.keys) {
          if (key.meta?.private) {
            if (key.id && key.meta.private.keyId in keys && key.meta.private.content) {
              try {
                const decrypted = decrypt(keys[key.meta.private.keyId], key.meta.private.content)
                sharedKeys[key.id] = decrypted
                if (config.transientSecretKeys) {
                  config.transientSecretKeys[key.id] = decrypted
                }
              } catch (e) {
                console.error(`OP_KEY_SHARE decryption error '${e.message || e}':`, e)
              }
            }
          }
        }

        // If we already have the keys, we can return as the contract state will not be affected
        const receivedNewKeys = !targetState._volatile?.keys || Object.keys(sharedKeys).reduce((acc, keyId) => acc && !!targetState._volatile.keys[keyId], true)

        if (!receivedNewKeys) {
          console.log({ receivedNewKeys, sharedKeys, existingKeys: targetState._volatile?.keys })
          return
        }

        const existingKeys = targetState._volatile?.keys

        Promise.resolve().then(async () => {
          console.log('Processing OP_KEY_SHARE (inside promise)')
          if (targetState._volatile?.pendingKeyRequests?.length) {
            if (!Object.keys(targetState).some((k) => k !== '_volatile')) {
              // If the contract only has _volatile state, we don't force sync it
              return
            }
            console.log('Inside pendingKeyRequests if')
            // Since we have received new keys, the current contract state might be wrong, so we need to remove the contract and resync
            await sbp('chelonia/contract/remove', v.contractID)
            // Sync...
            await sbp('chelonia/configure', {
              transientSecretKeys: {
                ...existingKeys,
                ...keys,
                ...sharedKeys
              }
            }).then(() => {
              // WARNING! THIS MIGHT DEADLOCK!!!
              self.setPostSyncOp(v.contractID, 'received-keys', ['okTurtles.events/emit', CONTRACT_HAS_RECEIVED_KEYS, { contractID: v.contractID }])

              return sbp('chelonia/withEnv', env, [
                'chelonia/private/in/syncContract', v.contractID
              ])
            })
          } else {
            console.log('No pendingKeyRequests')
          }
        }).then(() => {
          if (!targetState._volatile) targetState._volatile = Object.create(null)
          if (!targetState._volatile.keys) {
            targetState._volatile.keys = {
              ...existingKeys,
              ...sharedKeys
            }
          } else {
            Object.entries((sharedKeys: any)).forEach(([k, v]) => { targetState._volatile.keys[k] = v })
          }
          // TODO Instead of deleting all key requests, remove the current one only
          targetState._volatile.pendingKeyRequests = []
        })
      },
      [GIMessage.OP_KEY_REQUEST] (v: GIOpKeyRequest) {
        // TODO: Verify that v.outerKeyId matches actual signing key
        if (state._vm?.invites?.[v.outerKeyId]?.quantity != null) {
          if (state._vm.invites[v.outerKeyId].quantity > 0) {
            state._vm.invites[v.outerKeyId].quantity--
          } else {
            console.error('Ignoring OP_KEY_REQUEST because it exceeds allowed quantity: ' + JSON.stringify(v))
            return
          }
        }

        if (state._vm?.invites?.[v.outerKeyId]?.expires != null) {
          if (state._vm.invites[v.outerKeyId].expires < Date.now()) {
            console.error('Ignoring OP_KEY_REQUEST because it expired at ' + state._vm.invites[v.outerKeyId].expires + ': ' + JSON.stringify(v))
            return
          }
        }

        if (config.skipActionProcessing || env.skipActionProcessing || state?._volatile?.pendingKeyRequests?.length) {
          return
        }

        if (!state._vm.pendingKeyshares) state._vm.pendingKeyshares = Object.create(null)
        state._vm.pendingKeyshares[message.hash()] = [
          message.originatingContractID(),
          message.head().previousHEAD,
          v
        ]

        // Call 'chelonia/private/respondToKeyRequests' after sync
        self.setPostSyncOp(contractID, 'respondToKeyRequests-' + message.contractID(), ['chelonia/private/respondToKeyRequests', contractID])
      },
      [GIMessage.OP_KEY_REQUEST_SEEN] (v: GIOpKeyRequestSeen) {
        if (config.skipActionProcessing || env.skipActionProcessing || state?._volatile?.pendingKeyRequests?.length) {
          return
        }
        // TODO: Handle boolean (success) value

        if (state._vm.pendingKeyshares && v.keyRequestHash in state._vm.pendingKeyshares) {
          const hash = v.keyRequestHash
          const keyId = state._vm.pendingKeyshares[hash][2].outerKeyId
          if (Array.isArray(state._vm?.invites?.[keyId]?.responses)) {
            state._vm?.invites?.[keyId]?.responses.push(state._vm.pendingKeyshares[hash][0])
          }
          const originatingContractID = state._vm.pendingKeyshares[hash][0]
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
        const keys = { ...config.transientSecretKeys, ...state._volatile?.keys }
        // Order is so that KEY_ADD doesn't overwrite existing keys
        // TODO: Verify ringLevel
        // TODO: Handle the case of an existing key: its permissions are then augmented
        if (!signingKey) {
          throw new Error('Signing key not found but is mandatory for OP_KEY_ADD')
        }
        validateKeyAddPermissions(contractID, signingKey, state, v)
        config.reactiveSet(state._vm, 'authorizedKeys', { ...keysToMap(v), ...state._vm.authorizedKeys })
        keyAdditionProcessor.call(self, keys, v, state, contractID)
      },
      [GIMessage.OP_KEY_DEL] (v: GIOpKeyDel) {
        if (!state._vm.authorizedKeys) config.reactiveSet(state._vm, 'authorizedKeys', {})
        if (!signingKey) {
          throw new Error('Signing key not found but is mandatory for OP_KEY_DEL')
        }
        validateKeyDelPermissions(contractID, signingKey, state, v)
        v.forEach((keyId) => {
          const key = state._vm.authorizedKeys[v]
          delete state._vm.authorizedKeys[v]
          if (state._volatile?.keys) { delete state._volatile.keys[v] }

          const rootState = sbp(this.config.stateSelector)

          // Check contractState._volatile.watch for contracts that should be
          // mirroring this operation
          if (Array.isArray(state._volatile?.watch)) {
            state._volatile.watch.filter(([name]) => name === key.name).forEach(([, contractID]) => {
              // Find suitable singing key, if so emit OP_KEY_DEL on the other contract
              const foreginContractKey = rootState[contractID]?._vm?.authorizedKeys?.[keyId]
              if (foreginContractKey && foreginContractKey.foreignKey) {
                const signingKeyId = findSuitableSecretKeyId(rootState[contractID], [GIMessage.OP_KEY_DEL], ['sig'], foreginContractKey.ringLevel, Object.keys(config.transientSecretKeys))
                const contractName = rootState.contracts[contractID]?.type

                if (contractName && signingKeyId) {
                  sbp('chelonia/out/keyDel', { contractID, contractName, data: [keyId], signingKeyId })
                }
              }
            })

            // Stop watching events for this key
            state._volatile.watch = state._volatile.watch.filter(([name]) => name !== key.name)
          }

          // Are we deleting a foreign key? If so, we also need to remove
          // the operation from (1) _volatile.watch (on the other contract)
          // and (2) postSyncOperations
          if (key.foreignKey) {
            const fkUrl = new URL(key.foreignKey)
            const foreignContract = fkUrl.pathname
            const foreignKeyName = fkUrl.searchParams.get('keyName')

            if (!foreignContract || !foreignKeyName) throw new Error('Invalid foregin key: missing contract or key name')

            if (Array.isArray(rootState[foreignContract]?._volatile?.watch)) {
              // Stop watching events for this key
              rootState[foreignContract]._volatile.watch = rootState[foreignContract]._volatile.watch.filter(([name, cID]) => name !== foreignKeyName || cID !== contractID)
            }

            delete self.postSyncOperations?.[contractID][`syncAndMirrorKeys-${foreignContract}-${encodeURIComponent(foreignKeyName)}`]
          }
        })
        // TODO: Revoke invite keys if (key.meta?.type === '#inviteKey')
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
    let signingKey: ?GIKey

    // Signature verification
    if (signature.type === 'default') {
      if (process.env.ALLOW_INSECURE_UNENCRYPTED_MESSAGES_WHEN_EKEY_NOT_FOUND === 'true') {
        console.error('Received unsigned message', message)
      } else {
        console.error('Received unsigned message. Aborting.', message)
        throw new ChelErrorUnexpected('Received unsigned message')
      }
    } else {
      // This sync code has potential issues
      // The first issue is that it can deadlock if there are circular references
      // The second issue is that it doesn't handle key rotation. If the key used for signing is invalidated / removed from the originating contract, we won't have it in the state
      // Both of these issues can be resolved by introducing a parameter with the message ID the state is based on. This requires implementing a separate, ephemeral, state container for operations that refer to a different contract.
      // The difficulty of this is how to securely determine the message ID to use.
      // The server can assist with this.

      const authorizedKeys = opT === GIMessage.OP_CONTRACT ? keysToMap(((opV: any): GIOpContract).keys) : state._vm.authorizedKeys
      signingKey = authorizedKeys?.[signature.keyId]

      // `signingKey` may not be present in the contract. This happens in cross-contract interactions,
      // where a contract writes to another contract using its own keys. For example, when one requests
      // to join a group, that message cannot be signed by the group because the secret key is only known
      // to group members. Instead, it is signed with the keys of the person joining.
      // TODO: Restrict this to OP_KEY_SHARE only
      if (!signingKey && opT !== GIMessage.OP_CONTRACT && message.originatingContractID() !== message.contractID()) {
        const originatingContractState = await sbp('chelonia/withEnv', { skipActionProcessing: true }, [
          'chelonia/latestContractState', message.originatingContractID()
        ])

        signingKey = originatingContractState._vm?.authorizedKeys?.[signature.keyId]
      }

      // Verify that the signing key is found, has the correct purpose and is
      // allowed to sign this particular operation
      if (!signingKey || !Array.isArray(signingKey.purpose) || !signingKey.purpose.includes('sig') || (signingKey.permissions !== '*' && (!Array.isArray(signingKey.permissions) || !signingKey.permissions.includes(opT)))) {
        throw new Error('No matching signing key was defined')
      }

      verifySignature(signingKey.data, signedPayload, signature.data)
    }

    if (config[`preOp_${opT}`]) {
      processOp = config[`preOp_${opT}`](message, state) !== false && processOp
    }
    opFns[opT](opV)
    if (processOp && !config.skipActionProcessing && !env.skipActionProcessing) {
      config.postOp && config.postOp(message, state)
      config[`postOp_${opT}`] && config[`postOp_${opT}`](message, state)
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
    const latest = await sbp('chelonia/out/latestHash', contractID)
    console.debug(`[chelonia] syncContract: ${contractID} latestHash is: ${latest}`)
    // there is a chance two users are logged in to the same machine and must check their contracts before syncing
    let recent
    if (state.contracts[contractID]) {
      recent = state.contracts[contractID].HEAD
    } else {
      // we're syncing a contract for the first time, make sure to add to pending
      // so that handleEvents knows to expect events from this contract
      if (!state.contracts[contractID] && !state.pending.includes(contractID)) {
        state.pending.push(contractID)
      }
    }
    sbp('okTurtles.events/emit', CONTRACT_IS_SYNCING, contractID, true)
    this.currentSyncs[contractID] = { firstSync: !state.contracts[contractID] }
    this.postSyncOperations[contractID] = this.postSyncOperations[contractID] ?? Object.create(null)
    try {
      if (latest !== recent) {
        console.debug(`[chelonia] Synchronizing Contract ${contractID}: our recent was ${recent || 'undefined'} but the latest is ${latest}`)
        // TODO: fetch events from localStorage instead of server if we have them
        const events = await sbp('chelonia/out/eventsSince', contractID, recent || contractID)
        // remove the first element in cases where we are not getting the contract for the first time
        state.contracts[contractID] && events.shift()
        for (let i = 0; i < events.length; i++) {
          // this must be called directly, instead of via enqueueHandleEvent
          await sbp('chelonia/private/in/handleEvent', GIMessage.deserialize(events[i]))
        }
      } else {
        console.debug(`[chelonia] contract ${contractID} was already synchronized`)
      }

      // The postSyncOperations might await on calls to withEnv or queue event, leading to a deadlock. Therefore, we specifically and deliberately don't await on these calls
      Object.values(this.postSyncOperations[contractID]).map(async (op) => {
        try {
          await sbp.apply(sbp, op)
        } catch (e) {
          console.error(`Post-sync operation for ${contractID} failed`, { contractID, op, error: e?.message || e })
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
  'chelonia/private/in/syncContractAndWatchKeys': function (contractID: string, keyName: string, externalContractID: string, keyId: string) {
    return sbp('chelonia/queueInvocation', contractID, [
      'chelonia/private/in/syncContract', contractID
    ]).then(() => {
      const state = sbp(this.config.stateSelector)
      const contractState = state[contractID]

      // Does the key exist? If not, it has probably been removed and instead
      // of waiting, we need to remove it ourselves
      if (contractState._vm?.authorizedKeys && !Object.values(contractState._vm.authorizedKeys).find((k) => ((k: any): GIKey).name === keyName)) {
        const signingKeyId = findSuitableSecretKeyId(state[externalContractID], [GIMessage.OP_KEY_DEL], ['sig'], state[externalContractID]._vm?.authorizedKeys?.[keyId].ringLevel, Object.keys(this.config.transientSecretKeys))
        const externalContractName = state.contracts[externalContractID]?.type

        if (externalContractName && signingKeyId) {
          sbp('chelonia/out/keyDel', { contractID: externalContractID, contractName: externalContractName, data: [keyId], signingKeyId })
        }
      }

      // Add keys to watchlist as another contract is waiting on these
      // operations
      if (!contractState._volatile) contractState._volatile = { watch: [[keyName, externalContractID]] }
      if (!contractState._volatile.watch) contractState._volatile.watch = [[keyName, externalContractID]]
      if (Array.isArray(contractState._volatile.watch) && !contractState._volatile.watch.find((v) => v[0] === keyName && v[1] === externalContractID)) contractState._volatile.watch.push([keyName, externalContractID])
    })
  },
  'chelonia/private/respondToKeyRequests': async function (contractID: string) {
    const state = sbp(this.config.stateSelector)
    const contractState = state[contractID] ?? {}

    if (!contractState._vm || !contractState._vm.pendingKeyshares) {
      return
    }

    const pending = contractState._vm.pendingKeyshares

    delete contractState._vm.pendingKeyshares

    const signingKeyId = findSuitableSecretKeyId(contractState, [GIMessage.OP_KEY_REQUEST_SEEN], ['sig'], undefined, Object.keys(this.config.transientSecretKeys || {}))

    if (!signingKeyId) {
      console.log('Unable to respond to key request because there is no suitable secret key with OP_KEY_REQUEST_SEEN permission')
      return
    }

    await Promise.all(Object.entries(pending).map(async ([hash, entry]) => {
      if (!Array.isArray(entry) || entry.length !== 3) {
        return
      }

      const [originatingContractID, previousHEAD, v] = ((entry: any): [string, string, GIOpKeyRequest])

      // 1. Sync (originating) identity contract

      const originatingState = await sbp('chelonia/withEnv', { skipActionProcessing: true }, [
        'chelonia/latestContractState', originatingContractID
      ])

      const contractName = state.contracts[contractID].type
      const originatingContractName = originatingState._vm.type

      try {
        // 2. Verify 'data'
        const { data, keyId, encryptionKeyId, outerKeyId } = v

        const signingKey = originatingState._vm?.authorizedKeys[keyId]

        if (!signingKey || !signingKey.data) {
          throw new Error('Unable to find signing key')
        }

        // sign(originatingContractID + GIMessage.OP_KEY_REQUEST + contractID + HEAD)
        const signedInnerData = [originatingContractID, encryptionKeyId, outerKeyId, GIMessage.OP_KEY_REQUEST, contractID, previousHEAD]
        signedInnerData.forEach(x => { if (x.includes('|')) { throw Error(`contains '|': ${x}`) } })

        verifySignature(signingKey.data, signedInnerData.join('|'), data)

        const encryptionKey = originatingState._vm.authorizedKeys[encryptionKeyId]

        if (!encryptionKey || !encryptionKey.data) {
          throw new Error('Unable to find encryption key')
        }

        const keys = contractState._volatile?.keys && Object.fromEntries(Object.entries(contractState._volatile?.keys).filter(([kId]) => contractState._vm.authorizedKeys[kId]?.meta?.private?.shareable))

        if (!keys || Object.keys(keys).length === 0) {
          console.info('respondToKeyRequests: no keys to share', { contractID, originatingContractID })
          return
        }

        // 3. Send OP_KEY_SHARE to identity contract
        await sbp('chelonia/out/keyShare', {
          destinationContractID: originatingContractID,
          destinationContractName: originatingContractName,
          originatingContractName: contractName,
          originatingContractID: contractID,
          data: {
            contractID: contractID,
            keys: Object.entries(keys).map(([keyId, key]: [string, mixed]) => ({
              id: keyId,
              meta: {
                private: {
                  keyId: encryptionKeyId,
                  content: encrypt(encryptionKey.data, (key: any)),
                  shareable: true
                }
              }
            }))
          },
          signingKeyId
        })

        // 4(i). Remove originating contract and update current contract with information
        await sbp('chelonia/out/keyRequestResponse', { contractID, contractName, signingKeyId, data: { keyRequestHash: hash, success: true } })
      } catch (e) {
        console.error('Error at respondToKeyRequests', e)

        // 4(ii). Remove originating contract and update current contract with information
        await sbp('chelonia/out/keyRequestResponse', { contractID, contractName, signingKeyId, data: { keyRequestHash: hash, success: false } })
      }
    }))
  },
  'chelonia/private/in/handleEvent': async function (message: GIMessage) {
    const state = sbp(this.config.stateSelector)
    const contractID = message.contractID()
    const hash = message.hash()
    const { preHandleEvent, postHandleEvent, handleEventError } = this.config.hooks
    let processingErrored = false
    // Errors in mutations result in ignored messages
    // Errors in side effects result in dropped messages to be reprocessed
    try {
      preHandleEvent && await preHandleEvent(message)
      // verify we're expecting to hear from this contract
      if (isNaN(1) && !state.pending.includes(contractID) && !state.contracts[contractID]) {
        console.warn(`[chelonia] WARN: ignoring unexpected event ${message.description()}:`, message.serialize())
        throw new ChelErrorUnexpected()
      }
      // the order the following actions are done is critically important!
      // first we make sure we save this message to the db
      // if an exception is thrown here we do not need to revert the state
      // because nothing has been processed yet
      const proceed = await handleEvent.addMessageToDB(message)
      if (proceed === false) return

      const contractStateCopy = cloneDeep(state[contractID] || null)
      // process the mutation on the state
      // IMPORTANT: even though we 'await' processMutation, everything in your
      //            contract's 'process' function must be synchronous! The only
      //            reason we 'await' here is to dynamically load any new contract
      //            source / definitions specified by the GIMessage
      try {
        await handleEvent.processMutation.call(this, message, state)
      } catch (e) {
        console.error(`[chelonia] ERROR '${e.name}' in processMutation for ${message.description()}: ${e.message || e}`, e, message.serialize())
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
      }
      // process any side-effects (these must never result in any mutation to the contract state!)
      if (!processingErrored) {
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
          postHandleEvent && await postHandleEvent(message)
          sbp('okTurtles.events/emit', hash, contractID, message)
          sbp('okTurtles.events/emit', EVENT_HANDLED, contractID, message)
        } catch (e) {
          console.error(`[chelonia] ERROR '${e.name}' for ${message.description()} in event post-handling: ${e.message}`, e, { message: message.serialize() })
        }
      }
    } catch (e) {
      console.error(`[chelonia] ERROR in handleEvent: ${e.message || e}`, e)
      handleEventError?.(e, message)
      if (!(e instanceof ChelErrorUnexpected)) {
        // sometimes we get this error in the following situation:
        // Cypress tests run, generate a lot of messages, we are logged out, which
        // clears the state, but we still receive the message, and since the state
        // has been cleared, no contracts exist, and ChelErrorUnexpected is thrown
        throw e
      }
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
  async processMutation (message: GIMessage, state: Object) {
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
      if (!state[contractID]) this.config.reactiveSet(state, contractID, {})
      this.config.reactiveSet(state.contracts, contractID, { type, HEAD: contractID })
      // we've successfully received it back, so remove it from expectation pending
      const index = state.pending.indexOf(contractID)
      index !== -1 && state.pending.splice(index, 1)
      sbp('okTurtles.events/emit', CONTRACTS_MODIFIED, state.contracts)
    }
    await sbp('chelonia/private/in/processMessage', message, state[contractID])

    // call contract sync again if we get a key request, so that we can respond to any unhandled key requests.
    if (!sbp('chelonia/contract/isSyncing', contractID) && [GIMessage.OP_KEY_ADD, GIMessage.OP_KEY_REQUEST].includes(message.opType())) {
      sbp('chelonia/contract/sync', contractID)
    }
  },
  async processSideEffects (message: GIMessage, state: Object) {
    if ([GIMessage.OP_ACTION_ENCRYPTED, GIMessage.OP_ACTION_UNENCRYPTED].includes(message.opType())) {
      const contractID = message.contractID()
      const manifestHash = message.manifest()
      const hash = message.hash()
      const id = message.id()
      const { action, data, meta } = message.decryptedValue()
      const mutation = { data, meta, hash, id, contractID, description: message.description() }
      await sbp(`${manifestHash}/${action}/sideEffect`, mutation)
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
