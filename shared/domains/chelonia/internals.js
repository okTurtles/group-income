'use strict'

import sbp from '@sbp/spb'
import { GIMessage, sanityCheck } from './GIMessage.js'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'
import { b64ToStr } from '~/shared/functions.js'
import { randomIntFromRange, delay } from '~/frontend/utils/giLodash.js'

import type { GIOpContract, GIOpType, GIOpActionEncrypted, GIOpActionUnencrypted, GIOpPropSet, GIOpKeyAdd } from './GIMessage.js'

export const CONTRACT_IS_SYNCING = 'contract-is-syncing'

sbp('sbp/selectors/register', {
  //     DO NOT CALL ANY OF THESE YOURSELF!
  // TODO: make this private
  'chelonia/in/processMessage': function (message: GIMessage, state: Object) {
    sanityCheck(message)
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
    if (latest !== recent) {
      console.debug(`Now Synchronizing Contract: ${contractID} its most recent was ${recent || 'undefined'} but the latest is ${latest}`)
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
      console.debug(`Contract ${contractID} was already synchronized`)
    }
    sbp('okTurtles.events/emit', CONTRACT_IS_SYNCING, contractID, false)
  },
  'chelonia/private/in/handleEvent': async function (message: GIMessage) {
    const state = sbp(this.config.stateSelector)
    const contractID = message.contractID()
    try {
      if (!state[contractID]) {
        this.config.reactiveSet(state, contractID, {})
      }
      if (this.config.preHandleEvent) {
        await this.config.preHandleEvent(message)
      }
      // TODO: we should be able to avoid caring about store.registerModule
      if (message.isFirstMessage()) {
        // Flow doesn't understand that a first message must be a contract,
        // so we have to help it a bit in order to acces the 'type' property.
        const { type } = ((message.opValue(): any): GIOpContract)
        store.commit('registerContract', { contractID, type })
      }
      sbp('chelonia/in/processMessage', message, state[contractID])
      store.commit('setContractHEAD', { contractID, HEAD: hash })
      sbp('okTurtles.events/emit', message.hash(), message)
    } catch (e) {

    }
  },
  'chelonia/private/out/publishEvent': async (entry: GIMessage, { maxAttempts = 2 } = {}) => {
    const contractID = entry.contractID()
    let attempt = 1
    // auto resend after short random delay
    // https://github.com/okTurtles/group-income/issues/608
    while (true) {
      const r = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/event`, {
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
          console.error(`publishLogEntry: failed to publish ${entry.description()} after ${attempt} attempts`, entry)
          throw new Error(`publishLogEntry: ${r.status} - ${r.statusText}. attempt ${attempt}`)
        }
        // create new entry
        const randDelay = randomIntFromRange(0, 1500)
        console.warn(`publishLogEntry: attempt ${attempt} of ${maxAttempts} failed. Waiting ${randDelay} msec before resending ${entry.description()}`)
        attempt += 1
        await delay(randDelay) // wait half a second before sending it again
        // if this isn't OP_CONTRACT, get latestHash, recreate and resend message
        if (!entry.isFirstMessage()) {
          const previousHEAD = await sbp('backend/latestHash', contractID)
          entry = GIMessage.createV1_0(contractID, previousHEAD, entry.op())
        }
      } else {
        console.error(`publishLogEntry: ${r.status} - ${r.statusText}, failed to publish ${entry.description()}:`, entry)
        throw new Error(`publishLogEntry: ${r.status} - ${r.statusText}`)
      }
    }
  },
  'chelonia/private/out/latestHash': (contractID: string) => {
    return fetch(`${sbp('okTurtles.data/get', 'API_URL')}/latestHash/${contractID}`)
      .then(handleFetchResult('text'))
  },
  // TODO: r.body is a stream.Transform, should we use a callback to process
  //       the events one-by-one instead of converting to giant json object?
  //       however, note if we do that they would be processed in reverse...
  'chelonia/private/out/eventsSince': async (contractID: string, since: string) => {
    const events = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/events/${contractID}/${since}`)
      .then(handleFetchResult('json'))
    if (Array.isArray(events)) {
      return events.reverse().map(b64ToStr)
    }
  }
})

const notImplemented = (v) => {
  throw new Error(`chelonia: action not implemented to handle: ${JSON.stringify(v)}.`)
}
