'use strict'

import sbp from '@sbp/spb'
import { GIMessage } from './GIMessage.js'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'
import { b64ToStr } from '~/shared/functions.js'
import { randomIntFromRange, delay, cloneDeep, debounce } from '~/frontend/utils/giLodash.js'
import { ChelErrorDBBadPreviousHEAD, ChelErrorDBConnection, ChelErrorUnexpected, ChelErrorUnrecoverable } from './errors.js'

import type { GIOpContract, GIOpType, GIOpActionEncrypted, GIOpActionUnencrypted, GIOpPropSet, GIOpKeyAdd } from './GIMessage.js'

export const CONTRACT_IS_SYNCING = 'contract-is-syncing'
export const CONTRACTS_MODIFIED = 'contracts-modified'
export const EVENT_HANDLED = 'event-handled'

sbp('sbp/selectors/register', {
  //     DO NOT CALL ANY OF THESE YOURSELF!
  'chelonia/private/state': function () {
    return this.state
  },
  // TODO: make this private
  'chelonia/private/in/processMessage': async function (message: GIMessage, state: Object) {
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
    // to syncContractWithServer(), to prevent gi.db from throwing
    // "bad previousHEAD" errors
    return sbp('okTurtles.eventQueue/queueEvent', event.contractID(), [
      'chelonia/private/in/handleEvent', event
    ])
  },
  'chelonia/private/in/syncContract': async function (contractID: string) {
    const state = sbp(this.config.stateSelector)
    const latest = await sbp('chelonia/private/out/latestHash', contractID)
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
    try {
      if (latest !== recent) {
        console.debug(`[chelonia] Synchronizing Contract ${contractID}: our recent was ${recent || 'undefined'} but the latest is ${latest}`)
        sbp('okTurtles.events/emit', CONTRACT_IS_SYNCING, contractID, true)
        // TODO: fetch events from localStorage instead of server if we have them
        const events = await sbp('chelonia/private/out/eventsSince', contractID, recent || contractID)
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
    const { preHandleEvent, postHandleEvent, handleEventError } = this.config.hooks
    try {
      preHandleEvent && await preHandleEvent(message)
      // verify we're expecting to hear from this contract
      if (!state.pending.includes(contractID) && !state.contracts[contractID]) {
        console.warn(`[chelonia] WARN: ignoring unexpected event ${message.description()}:`, message.serialize())
        throw new ChelErrorUnexpected()
      }
      // the order the following actions are done is critically important!
      // first we make sure we save this message to the db
      await handleEvent.addMessageToDB(message)

      const stateCopy = cloneDeep(state[contractID])
      try {
        // process the mutation on the state (everything here must be synchronous)
        await handleEvent.processMutation.call(this, message, state)
        // process any side-effects (these must never result in any mutation to this contract state)
        if (!this.config.skipActionProcessing) {
          await handleEvent.processSideEffects.call(this, message)
          // TODO: reset head here on error
        }
        // remove any events that were added to eventsToReprocess if we reprocessed them
        const reprocessIdx = eventsToReprocess.indexOf(message.hash())
        if (reprocessIdx !== -1) {
          console.warn(`[chelonia] WARN: successfully reprocessed ${message.description()}`)
          eventsToReprocess.splice(reprocessIdx, 1)
        }
        postHandleEvent && await postHandleEvent(message)

        // let any listening components know that we've received, processed, and stored the event
        sbp('okTurtles.events/emit', message.hash(), contractID, message)
        sbp('okTurtles.events/emit', EVENT_HANDLED, contractID, message)
      } catch (e) {
        state[contractID] = stateCopy
      }
    } catch (e) {
      console.error(`[chelonia] ERROR in handleEvent: ${e.message}`, e)
      handleEventError?.(e, message)
      throw e
    }
  },
  'chelonia/private/out/publishEvent': async (entry: GIMessage, { maxAttempts = 2 } = {}) => {
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
          throw new Error(`publishLogEntry: ${r.status} - ${r.statusText}. attempt ${attempt}`)
        }
        // create new entry
        const randDelay = randomIntFromRange(0, 1500)
        console.warn(`[chelonia] publish attempt ${attempt} of ${maxAttempts} failed. Waiting ${randDelay} msec before resending ${entry.description()}`)
        attempt += 1
        await delay(randDelay) // wait half a second before sending it again
        // if this isn't OP_CONTRACT, get latestHash, recreate and resend message
        if (!entry.isFirstMessage()) {
          const previousHEAD = await sbp('chelonia/private/out/latestHash', contractID)
          entry = GIMessage.createV1_0(contractID, previousHEAD, entry.op())
        }
      } else {
        console.error(`[chelonia] ERROR: failed to publish ${entry.description()}: ${r.status} - ${r.statusText}`, entry)
        throw new Error(`publishLogEntry: ${r.status} - ${r.statusText}`)
      }
    }
  },
  'chelonia/private/out/latestHash': (contractID: string) => {
    return fetch(`${this.config.connectionURL}/latestHash/${contractID}`)
      .then(handleFetchResult('text'))
  },
  // TODO: r.body is a stream.Transform, should we use a callback to process
  //       the events one-by-one instead of converting to giant json object?
  //       however, note if we do that they would be processed in reverse...
  'chelonia/private/out/eventsSince': async (contractID: string, since: string) => {
    const events = await fetch(`${this.config.connectionURL}/events/${contractID}/${since}`)
      .then(handleFetchResult('json'))
    if (Array.isArray(events)) {
      return events.reverse().map(b64ToStr)
    }
  }
})

const eventsToReprocess = []
const reprocessDebounced = debounce((contractID) => sbp('chelonia/contract/sync', contractID), 1000)

const handleEvent = {
  async addMessageToDB (message: GIMessage) {
    const contractID = message.contractID()
    try {
      await sbp('chelonia/db/addEntry', message)
    } catch (e) {
      if (e instanceof ChelErrorDBBadPreviousHEAD) {
        // sometimes we simply miss messages, it's not clear why, but it happens
        // in rare cases. So we attempt to re-sync this contract once
        if (eventsToReprocess.length > 100) {
          throw new ChelErrorUnrecoverable('more than 100 bad previousHEAD errors')
        }
        if (!eventsToReprocess.includes(message.hash())) {
          console.warn(`[chelonia] WARN bad previousHEAD for ${message.description()}, will attempt to re-sync contract ${contractID}`)
          eventsToReprocess.push(message.hash())
          reprocessDebounced(contractID)
        } else {
          console.error(`[chelonia] ERROR already attempted to re-process ${message.description()}, will not attempt again!`)
        }
      }
      throw e
    }
  },
  async processMutation (message: GIMessage, state: Object) {
    const contractID = message.contractID()
    const hash = message.hash()
    let stateCopy
    try {
      if (message.isFirstMessage()) {
        // Flow doesn't understand that a first message must be a contract,
        // so we have to help it a bit in order to acces the 'type' property.
        const { type } = ((message.opValue(): any): GIOpContract)
        if (!state[contractID]) {
          this.config.reactiveSet(state, contractID, {})
          this.config.reactiveSet(state.contracts, contractID, { type, HEAD: contractID })
        }
        // we've successfully received it back, so remove it from expectation pending
        const index = state.pending.indexOf(contractID)
        index !== -1 && state.pending.splice(index, 1)
        sbp('okTurtles.events/emit', CONTRACTS_MODIFIED, state.contracts)
      }
      stateCopy = cloneDeep(state[contractID])
      await sbp('chelonia/private/in/processMessage', message, state[contractID])
      state.contracts[contractID].HEAD = hash
    } catch (e) {
      console.error(`[chelonia] ERROR '${e.name}' in processMutation for ${message.description()}: ${e.message}`, e, message.serialize())
      this.config.hooks.processError?.(e, message)
      // TODO: this is wrong - everywhere we have GIErrorIgnoreAndBanIfGroup this shouldn't be done
      //       however, maybe we shouldn't be throwing exceptions in the contract at all, only
      //       reporting errors via console.error and 'gi.notifications/emit'
      // TODO: but someone could also send a purposefully malformed message that triggers
      //       an exception due to a bug, thereby permanently bringing the contract to a halt.
      //       we should therefore just ignore/skip messages that trigger exceptions, at least
      //       for mutations. while still reporting an error to the caller somehow
      //       so that the app can know to display an error/warning of some sort (or trigger autoban)
      // TODO: we should have consistent behavior whenever an exception is thrown (e.g. reversion
      //       of state). Figure out consistent behavior for sideEffect exceptions too.
      //       And we should definitely implement #1214 so that we don't have the following situation:
      //       a bugfix is made that prevents an exception from occurring, those who
      //       alreadye experienced the exception will not process the message state update.
      //       Those who join afterward won't experience the exception and therefore will process
      //       the message state update, resulting in inconsistent state.
      if (stateCopy) {
        console.warn(`[chelonia] WARN reverting contract state for ${contractID}`)
        state[contractID] = stateCopy // undo any changes that were done
      }
      throw e
    }
  },
  async processSideEffects (message: GIMessage) {
    try {
      if ([GIMessage.OP_ACTION_ENCRYPTED, GIMessage.OP_ACTION_UNENCRYPTED].includes(message.opType())) {
        const contractID = message.contractID()
        const hash = message.hash()
        const { action, data, meta } = message.decryptedValue()
        const mutation = { data, meta, hash, contractID }
        await sbp(`${action}/sideEffect`, mutation)
      }
    } catch (e) {
      console.error(`[chelonia] ERROR '${e.name}' in processSideEffects for ${message.description()}: ${e.message}`, e, message.serialize())
      // TODO: figure out what to do. the state is currently only restored if processMessage fails
      //       maybe we should restore it if either the mutation or sideEffect fails, and drop
      //       the message entirely / pause processing since some sideEffects are kinda significant
      //       (e.g. joining people to the group, etc.)
      // throw e
    }
  }
}

const notImplemented = (v) => {
  throw new Error(`chelonia: action not implemented to handle: ${JSON.stringify(v)}.`)
}
