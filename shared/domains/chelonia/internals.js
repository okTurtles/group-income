'use strict'

import sbp, { domainFromSelector } from '@sbp/sbp'
import './db.js'
import { encrypt, decrypt, verifySignature } from './crypto.js'
import type { GIKey, GIOpActionEncrypted, GIOpActionUnencrypted, GIOpContract, GIOpKeyAdd, GIOpKeyDel, GIOpKeyShare, GIOpPropSet, GIOpType, GIOpKeyRequest, GIOpKeyRequestResponse } from './GIMessage.js'
import { GIMessage } from './GIMessage.js'
import { randomIntFromRange, delay, cloneDeep, debounce, pick } from '~/frontend/model/contracts/shared/giLodash.js'
import { ChelErrorUnexpected, ChelErrorUnrecoverable } from './errors.js'
import { CONTRACT_IS_SYNCING, CONTRACTS_MODIFIED, EVENT_HANDLED } from './events.js'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'
import { b64ToStr, blake32Hash } from '~/shared/functions.js'
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
    const allowedSels = ['okTurtles.events/on', 'chelonia/defineContract']
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
      sbp: contractSBP
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
  'chelonia/private/out/publishEvent': async function (entry: GIMessage, { maxAttempts = 3 } = {}, signatureFn?: Function) {
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
          const previousHEAD = await sbp('chelonia/private/out/latestHash', contractID)
          entry = GIMessage.createV1_0({ contractID, previousHEAD, op: entry.op(), manifest: entry.manifest(), signatureFn })
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
    const contractID = message.contractID()
    const manifestHash = message.manifest()
    const config = this.config
    const signature = message.signature()
    const signedPayload = message.signedPayload()
    const env = this.env
    const self = this
    if (!state._vm) state._vm = Object.create(null)
    const opFns: { [GIOpType]: (any) => void } = {
      [GIMessage.OP_CONTRACT] (v: GIOpContract) {
        const keys = { ...env.additionalKeys, ...state._volatile?.keys }
        state._vm.authorizedKeys = keysToMap(v.keys)

        for (const key of v.keys) {
          if (key.meta?.private) {
            if (key.id && key.meta.private.keyId in keys && key.meta.private.content) {
              if (!state._volatile) state._volatile = { keys: {} }
              try {
                state._volatile.keys[key.id] = decrypt(keys[key.meta.private.keyId], key.meta.private.content)
              } catch (e) {
                console.error('Decryption error', e)
              }
            }
          }
          if (key.meta?.type === 'inviteKey') {
            if (!state._vm.invites) state._vm.invites = Object.create(null)
            state._vm.invites[key.id] = {
              creator: key.meta.creator,
              quantity: key.meta.quantity,
              expires: key.meta.expires,
              inviteSecret: state._volatile?.keys[key.id],
              responses: Object.create(null)
            }
          }
        }
      },
      [GIMessage.OP_ACTION_ENCRYPTED] (v: GIOpActionEncrypted) {
        if (!config.skipActionProcessing && !env.skipActionProcessing) {
          const decrypted = config.decryptFn.call(self, message.opValue(), state)
          opFns[GIMessage.OP_ACTION_UNENCRYPTED](decrypted)
        }
      },
      [GIMessage.OP_ACTION_UNENCRYPTED] (v: GIOpActionUnencrypted) {
        if (!config.skipActionProcessing && !env.skipActionProcessing) {
          const { data, meta, action } = v
          if (!config.whitelisted(action)) {
            throw new Error(`chelonia: action not whitelisted: '${action}'`)
          }
          sbp(`${manifestHash}/${action}/process`, { data, meta, hash, contractID }, state)
        }
      },
      [GIMessage.OP_KEYSHARE] (v: GIOpKeyShare) {
        // TODO: Prompt to user if contract not in pending
        if (message.originatingContractID() !== contractID && v.contractID !== message.originatingContractID()) {
          throw new Error('External contracts can only set keys for themselves')
        }

        const cheloniaState = sbp(self.config.stateSelector)

        if (!cheloniaState[v.contractID]) {
          cheloniaState[v.contractID] = Object.create(null)
        }
        const targetState = cheloniaState[v.contractID]

        const keys = { ...env.additionalKeys, ...state._volatile?.keys }

        for (const key of v.keys) {
          if (key.meta?.private) {
            if (key.id && key.meta.private.keyId in keys && key.meta.private.content) {
              if (!targetState._volatile) targetState._volatile = { keys: {} }
              try {
                const decrypted = decrypt(keys[key.meta.private.keyId], key.meta.private.content)
                targetState._volatile.keys[key.id] = decrypted
                if (env.additionalKeys) {
                  env.additionalKeys[key.id] = decrypted
                }
              } catch (e) {
                console.error('Decryption error', e)
              }
            }
          }
        }
      },
      [GIMessage.OP_KEY_REQUEST] (v: GIOpKeyRequest) {
        if (config.skipActionProcessing || env.skipActionProcessing || state?._volatile?.pendingKeys) {
          return
        }

        if (!state._vm.pending_key_requests) state._vm.pending_key_requests = Object.create(null)
        state._vm.pending_key_requests[message.hash()] = [
          message.originatingContractID(),
          message.head().previousHEAD,
          v
        ]
        // TODO: Update count on _vm.invites
      },
      [GIMessage.OP_KEY_REQUEST_RESPONSE] (v: GIOpKeyRequestResponse) {
        if (state._vm.pending_key_requests && v in state._vm.pending_key_requests) {
          delete state._vm.pending_key_requests[v]
        }
      },
      [GIMessage.OP_PROP_DEL]: notImplemented,
      [GIMessage.OP_PROP_SET] (v: GIOpPropSet) {
        if (!state._vm.props) state._vm.props = {}
        state._vm.props[v.key] = v.value
      },
      [GIMessage.OP_KEY_ADD] (v: GIOpKeyAdd) {
        const keys = { ...env.additionalKeys, ...state._volatile?.keys }
        if (!state._vm.authorizedKeys) state._vm.authorizedKeys = {}
        // Order is so that KEY_ADD doesn't overwrite existing keys
        state._vm.authorizedKeys = { ...keysToMap(v), ...state._vm.authorizedKeys }
        // TODO: Move to different function, as this is implemented in OP_CONTRACT as well
        for (const key of v) {
          if (key.meta?.private) {
            if (key.id && key.meta.private.keyId in keys && key.meta.private.content) {
              if (!state._volatile) state._volatile = { keys: {} }
              try {
                state._volatile.keys[key.id] = decrypt(keys[key.meta.private.keyId], key.meta.private.content)
              } catch (e) {
                console.error('Decryption error', e)
              }
            }
          }
          if (key.meta?.type === 'inviteKey') {
            if (state._vm.invites) state._vm.invites = Object.create(null)
            state._vm.invites[key.id] = {
              creator: key.meta.creator,
              quantity: key.meta.quantity,
              expires: key.meta.expires,
              inviteSecret: state._volatile?.keys[key.id],
              responses: Object.create(null)
            }
          }
        }
      },
      [GIMessage.OP_KEY_DEL] (v: GIOpKeyDel) {
        if (!state._vm.authorizedKeys) state._vm.authorizedKeys = {}
        v.forEach(key => {
          delete state._vm.authorizedKeys[v]
          if (state._volatile?.keys) { delete state._volatile.keys[v] }
        })
        // TODO: Revoke invite keys if (key.meta?.type === 'inviteKey')
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

    // Signature verification
    // TODO: Temporary. Skip verifying default signatures
    if (isNaN(1) && signature.type !== 'default') {
      // This sync code has potential issues
      // The first issue is that it can deadlock if there are circular references
      // The second issue is that it doesn't handle key rotation. If the key used for signing is invalidated / removed from the originating contract, we won't have it in the state
      // Both of these issues can be resolved by introducing a parameter with the message ID the state is based on. This requires implementing a separate, ephemeral, state container for operations that refer to a different contract.
      // The difficulty of this is how to securely determine the message ID to use.
      // The server can assist with this.
      if (message.originatingContractID() !== message.contractID()) {
        await sbp('okTurtles.eventQueue/queueEvent', message.originatingContractID(), [
          'chelonia/private/in/syncContract', message.originatingContractID()
        ])
      }

      const contractState = message.originatingContractID() === message.contractID()
        ? state
        : sbp(this.config.stateSelector).contracts[message.originatingContractID()]

      const authorizedKeys = opT === GIMessage.OP_CONTRACT ? keysToMap(((opV: any): GIOpContract).keys) : contractState._vm.authorizedKeys
      const signingKey = authorizedKeys?.[signature.keyId]

      if (!signingKey || !Array.isArray(signingKey.permissions) || !signingKey.permissions.includes(opT)) {
        throw new Error('No matching signing key was defined')
      }

      verifySignature(signingKey.data, signedPayload, signature.data)
    }

    if (config[`preOp_${opT}`]) {
      processOp = config[`preOp_${opT}`](message, state) !== false && processOp
    }
    if (processOp && !config.skipActionProcessing && !env.skipActionProcessing) {
      opFns[opT](opV)
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
    // TODO: Handle race conditions
    await sbp('chelonia/private/respondToKeyRequests', event.contractID())
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
      sbp('okTurtles.events/emit', CONTRACT_IS_SYNCING, contractID, false)
      await sbp('chelonia/private/respondToKeyRequests', contractID)
    } catch (e) {
      console.error(`[chelonia] syncContract error: ${e.message}`, e)
      sbp('okTurtles.events/emit', CONTRACT_IS_SYNCING, contractID, false)
      this.config.hooks.syncContractError?.(e, contractID)
      throw e
    }
  },
  'chelonia/private/respondToKeyRequests': async function (contractID: string) {
    const state = sbp(this.config.stateSelector)
    const contractState = state[contractID] ?? {}

    if (!contractState._vm || !contractState._vm.pending_key_requests) {
      return
    }

    const pending = contractState._vm.pending_key_requests

    delete contractState._vm.pending_key_requests

    await Promise.all(Object.entries(pending).map(async ([hash, entry]) => {
      if (!Array.isArray(entry) || entry.length !== 3) {
        return
      }

      const [originatingContractID, previousHEAD, v] = ((entry: any): [string, string, GIOpKeyRequest])

      // 1. Sync (originating) identity contract
      await sbp('chelonia/withEnv', originatingContractID, { skipActionProcessing: true }, [
        'chelonia/private/in/syncContract', originatingContractID
      ])

      const contractName = state.contracts[contractID].type
      const recipientContractName = state.contracts[originatingContractID].type

      try {
        // 2. Verify 'data'
        const { data, keyId, encryptionKeyId } = v

        const originatingState = state[originatingContractID]

        const signingKey = originatingState._vm.authorizedKeys[keyId]

        if (!signingKey || !signingKey.data) {
          throw new Error('Unable to find signing key')
        }

        // sign(originatingContractID + GIMessage.OP_KEY_REQUEST + contractID + HEAD)
        verifySignature(signingKey.data, [originatingContractID, GIMessage.OP_KEY_REQUEST, contractID, previousHEAD].map(encodeURIComponent).join('|'), data)

        const encryptionKey = originatingState._vm.authorizedKeys[encryptionKeyId]

        if (!encryptionKey || !encryptionKey.data) {
          throw new Error('Unable to find encryption key')
        }

        const { keys, signingKeyId } = await sbp(`${contractName}/getShareableKeys`, contractID)

        // 3. Send OP_KEYSHARE to identity contract
        await sbp('chelonia/out/keyShare', {
          destinationContractID: originatingContractID,
          destinationContractName: recipientContractName,
          data: {
            contractID: contractID,
            keys: Object.entries(keys).map(([keyId, key]: [string, mixed]) => ({
              id: keyId,
              meta: {
                private: {
                  keyId: encryptionKeyId,
                  content: encrypt(encryptionKey.data, (key: any))
                }
              }
            }))
          },
          signingKeyId
        })
      } catch (e) {
        console.error('Error at respondToKeyRequests', e)
      } finally {
        // 4. Remove originating contract and update current contract with information
        await Promise.all([
          // TODO: Remove only if not previously subscribed
          sbp('chelonia/contract/removeImmediately', originatingContractID),
          sbp('chelonia/out/keyRequestResponse', { contractID, contractName, data: hash })
        ])
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
      if (!state.pending.includes(contractID) && !state.contracts[contractID]) {
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
      const stateCopy = cloneDeep(pick(state, ['pending', 'contracts']))
      // process the mutation on the state
      // IMPORTANT: even though we 'await' processMutation, everything in your
      //            contract's 'process' function must be synchronous! The only
      //            reason we 'await' here is to dynamically load any new contract
      //            source / definitions specified by the GIMessage
      try {
        await handleEvent.processMutation.call(this, message, state)
      } catch (e) {
        console.error(`[chelonia] ERROR '${e.name}' in processMutation for ${message.description()}: ${e.message}`, e, message.serialize())
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
          postHandleEvent && await postHandleEvent(message)
          sbp('okTurtles.events/emit', hash, contractID, message)
          sbp('okTurtles.events/emit', EVENT_HANDLED, contractID, message)
        } catch (e) {
          console.error(`[chelonia] ERROR '${e.name}' in side-effects for ${message.description()}: ${e.message}`, e, message.serialize())
          // revert everything
          handleEvent.revertSideEffect.call(this, { message, state, contractID, contractStateCopy, stateCopy })
          this.config.hooks.sideEffectError?.(e, message)
          throw e // rethrow to prevent the contract sync from going forward
        }
      }
    } catch (e) {
      console.error(`[chelonia] ERROR in handleEvent: ${e.message}`, e)
      handleEventError?.(e, message)
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
  async processMutation (message: GIMessage, state: Object) {
    const contractID = message.contractID()
    if (message.isFirstMessage()) {
      // Flow doesn't understand that a first message must be a contract,
      // so we have to help it a bit in order to acces the 'type' property.
      const { type } = ((message.opValue(): any): GIOpContract)
      if (!state[contractID]) {
        console.debug(`contract ${type} registered for ${contractID}`)
        this.config.reactiveSet(state, contractID, {})
        this.config.reactiveSet(state.contracts, contractID, { type, HEAD: contractID })
      }
      // we've successfully received it back, so remove it from expectation pending
      const index = state.pending.indexOf(contractID)
      index !== -1 && state.pending.splice(index, 1)
      sbp('okTurtles.events/emit', CONTRACTS_MODIFIED, state.contracts)
    }
    await sbp('chelonia/private/in/processMessage', message, state[contractID])
  },
  async processSideEffects (message: GIMessage, state: Object) {
    if ([GIMessage.OP_ACTION_ENCRYPTED, GIMessage.OP_ACTION_UNENCRYPTED].includes(message.opType())) {
      const contractID = message.contractID()
      const manifestHash = message.manifest()
      const hash = message.hash()
      const { action, data, meta } = this.config.decryptFn.call(this, message.opValue(), state)
      const mutation = { data, meta, hash, contractID }
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
  },
  revertSideEffect ({ message, state, contractID, contractStateCopy, stateCopy }) {
    console.warn(`[chelonia] reverting entire state because failed sideEffect for ${message.description()}: ${message.serialize()}`)
    if (!contractStateCopy) {
      this.config.reactiveDel(state, contractID)
    } else {
      this.config.reactiveSet(state, contractID, contractStateCopy)
    }
    state.contracts = stateCopy.contracts
    state.pending = stateCopy.pending
    sbp('okTurtles.events/emit', CONTRACTS_MODIFIED, state.contracts)
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
