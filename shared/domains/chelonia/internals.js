'use strict'

import sbp from '@sbp/sbp'
import './db.js'
import { GIMessage } from './GIMessage.js'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'
import { randomIntFromRange, delay, cloneDeep, debounce, pick } from '~/frontend/utils/giLodash.js'
import { ChelErrorUnexpected, ChelErrorUnrecoverable } from './errors.js'
import { CONTRACT_IS_SYNCING, CONTRACTS_MODIFIED, EVENT_HANDLED } from './events.js'

import type { GIOpContract, GIOpType, GIOpActionEncrypted, GIOpActionUnencrypted, GIOpPropSet, GIOpKeyAdd } from './GIMessage.js'

sbp('sbp/selectors/register', {
  //     DO NOT CALL ANY OF THESE YOURSELF!
  'chelonia/private/state': function () {
    return this.state
  },
  // used by, e.g. 'chelonia/contract/wait'
  'chelonia/private/noop': function () {},
  'chelonia/private/out/publishEvent': async function (entry: GIMessage, { maxAttempts = 3 } = {}) {
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
          entry = GIMessage.createV1_0(contractID, previousHEAD, entry.op())
        }
      } else {
        const message = (await r.json())?.message
        console.error(`[chelonia] ERROR: failed to publish ${entry.description()}: ${r.status} - ${r.statusText}: ${message}`, entry)
        throw new Error(`publishEvent: ${r.status} - ${r.statusText}: ${message}`)
      }
    }
  },
  'chelonia/private/in/processMessage': function (message: GIMessage, state: Object) {
    const [opT, opV] = message.op()
    const hash = message.hash()
    const contractID = message.contractID()
    const config = this.config
    if (!state._vm) state._vm = {}
    const opFns: { [GIOpType]: (any) => void } = {
      [GIMessage.OP_CONTRACT] (v: GIOpContract) {
        // TODO: shouldn't each contract have its own set of authorized keys?
        if (!state._vm.authorizedKeys) state._vm.authorizedKeys = []
        // TODO: we probably want to be pushing the de-JSON-ified key here
        state._vm.authorizedKeys.push({ key: v.keyJSON, context: 'owner' })
      },
      [GIMessage.OP_ACTION_ENCRYPTED] (v: GIOpActionEncrypted) {
        if (!config.skipActionProcessing) {
          const decrypted = message.decryptedValue(config.decryptFn)
          opFns[GIMessage.OP_ACTION_UNENCRYPTED](decrypted)
        }
      },
      [GIMessage.OP_ACTION_UNENCRYPTED] (v: GIOpActionUnencrypted) {
        if (!config.skipActionProcessing) {
          const { data, meta, action } = v
          if (!config.whitelisted(action)) {
            throw new Error(`chelonia: action not whitelisted: '${action}'`)
          }
          sbp(`${action}/process`, { data, meta, hash, contractID }, state)
        }
      },
      [GIMessage.OP_PROP_DEL]: notImplemented,
      [GIMessage.OP_PROP_SET] (v: GIOpPropSet) {
        if (!state._vm.props) state._vm.props = {}
        state._vm.props[v.key] = v.value
      },
      [GIMessage.OP_KEY_ADD] (v: GIOpKeyAdd) {
        // TODO: implement this. consider creating a function so that
        //       we're not duplicating code in [GIMessage.OP_CONTRACT]
        // if (!state._vm.authorizedKeys) state._vm.authorizedKeys = []
        // state._vm.authorizedKeys.push(v)
      },
      [GIMessage.OP_KEY_DEL]: notImplemented,
      [GIMessage.OP_PROTOCOL_UPGRADE]: notImplemented
    }
    let processOp = true
    if (config.preOp) {
      processOp = config.preOp(message, state) !== false && processOp
    }
    if (config[`preOp_${opT}`]) {
      processOp = config[`preOp_${opT}`](message, state) !== false && processOp
    }
    if (processOp && !config.skipProcessing) {
      opFns[opT](opV)
      config.postOp && config.postOp(message, state)
      config[`postOp_${opT}`] && config[`postOp_${opT}`](message, state)
    }
  },
  'chelonia/private/in/enqueueHandleEvent': function (event: GIMessage) {
    // make sure handleEvent is called AFTER any currently-running invocations
    // to 'chelonia/contract/sync', to prevent gi.db from throwing
    // "bad previousHEAD" errors
    return sbp('okTurtles.eventQueue/queueEvent', event.contractID(), [
      'chelonia/private/in/handleEvent', event
    ])
  },
  'chelonia/private/in/syncContract': async function (contractID: string) {
    const state = sbp(this.config.stateSelector)
    const latest = await sbp('chelonia/out/latestHash', contractID)
    console.debug(`syncContract: ${contractID} latestHash is: ${latest}`)
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
    } catch (e) {
      console.error(`[chelonia] syncContract error: ${e.message}`, e)
      sbp('okTurtles.events/emit', CONTRACT_IS_SYNCING, contractID, false)
      this.config.hooks.syncContractError?.(e, contractID)
      throw e
    }
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
      state.contracts[contractID].HEAD = hash
      // process any side-effects (these must never result in any mutation to the contract state!)
      if (!processingErrored) {
        try {
          if (!this.config.skipActionProcessing && !this.config.skipSideEffects) {
            await handleEvent.processSideEffects.call(this, message)
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
})

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
    await Promise.resolve() // TODO: load any unloaded contract code
    sbp('chelonia/private/in/processMessage', message, state[contractID])
  },
  async processSideEffects (message: GIMessage) {
    if ([GIMessage.OP_ACTION_ENCRYPTED, GIMessage.OP_ACTION_UNENCRYPTED].includes(message.opType())) {
      const contractID = message.contractID()
      const hash = message.hash()
      const { action, data, meta } = message.decryptedValue()
      const mutation = { data, meta, hash, contractID }
      await sbp(`${action}/sideEffect`, mutation)
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
