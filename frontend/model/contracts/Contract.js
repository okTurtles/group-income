'use strict'

import sbp from '~/shared/sbp.js'
import { GIMessage } from '~/shared/GIMessage.js'
import type { GIOpContract } from '~/shared/GIMessage.js'

// this must not be exported, but instead accessed through 'actionWhitelisted'
const whitelistedSelectors = {}
const sideEffectStacks = {} // [contractID]: Array<*>
const cheloniaCfg = sbp('okTurtles.data/get', 'CHELONIA_CONFIG')

cheloniaCfg.whitelisted = (sel) => !!whitelistedSelectors[sel]

export const ACTION_REGEX: RegExp = /^(([\w.]+)\/([^/]+)\/(?:([^/]+)\/)?)process$/
// ACTION_REGEX.exec('gi.contracts/group/payment/process')
// 0 => 'gi.contracts/group/payment/process'
// 1 => 'gi.contracts/group/payment/'
// 2 => 'gi.contracts'
// 3 => 'group'
// 4 => 'payment'

// TODO: move this to: 'chelonia/contract/define'
export function DefineContract (contract: Object) {
  const metadata = contract.metadata || { validate () {}, create: () => ({}) }
  const getters = contract.getters
  sbp('sbp/selectors/register', {
    // expose getters for Vuex integration and other conveniences
    [`${contract.name}/getters`]: () => getters,
    [`${contract.name}/state`]: contract.state,
    // there are 2 ways to cause sideEffects to happen: by defining a sideEffect function
    // in the contract, or by calling /pushSideEffect with an async SBP call. You can
    // also do both.
    [`${contract.name}/pushSideEffect`]: function (contractID, asyncSbpCall: Array<*>) {
      sideEffectStack(contractID).push(asyncSbpCall)
    }
  })
  for (const action in contract.actions) {
    if (action.indexOf(contract.name) !== 0) {
      throw new Error(`contract action '${action}' must start with prefix: ${contract.name}`)
    }
    const actionSelector = `${action}/process`
    whitelistedSelectors[actionSelector] = true
    sbp('sbp/selectors/register', {
      [`${action}/create`]: async function (data: Object, contractID: string | null = null) {
        let previousHEAD = null
        let state = null
        if (contractID) {
          state = contract.state(contractID)
          previousHEAD = await sbp('backend/latestHash', contractID)
        } else {
          if (action !== contract.name) {
            throw new Error(`contractID required when calling '${action}/create'`)
          }
          // TODO: move this to: 'chelonia/contract/register'
          const op: GIOpContract = {
            type: contract.name,
            authkey: {
              type: 'dummy',
              key: 'TODO: add group public key here'
            }
          }
          const contractMsg = GIMessage.createV1_0(null, null, [
            GIMessage.OP_CONTRACT,
            op
          ])
          await sbp('backend/publishLogEntry', contractMsg)
          contractID = previousHEAD = contractMsg.hash()
        }
        const meta = metadata.create()
        const gProxy = gettersProxy(state, getters)
        metadata.validate(meta, { state, ...gProxy, contractID })
        contract.actions[action].validate(data, { state, ...gProxy, meta, contractID })
        return GIMessage.createV1_0(contractID, previousHEAD, [
          GIMessage.OP_ACTION_ENCRYPTED,
          // TODO: encryption happens here
          JSON.stringify({ type: actionSelector, data, meta })
        ])
      },
      [actionSelector]: function (message: Object, state: Object) {
        const { meta, data, contractID } = message
        // TODO: optimize so that you're creating a proxy object only when needed
        const gProxy = gettersProxy(state, getters)
        state = state || contract.state(contractID)
        metadata.validate(meta, { state, ...gProxy, contractID })
        contract.actions[action].validate(data, { state, ...gProxy, meta, contractID })
        contract.actions[action].process(message, { state, ...gProxy })
      },
      [`${actionSelector}/sideEffect`]: async function (message: Object, state: ?Object) {
        const sideEffects = sideEffectStack(message.contractID)
        while (sideEffects.length > 0) {
          await sbp(...sideEffects.shift())
        }
        if (contract.actions[action].sideEffect) {
          state = state || contract.state(message.contractID)
          const gProxy = gettersProxy(state, getters)
          await contract.actions[action].sideEffect(message, { state, ...gProxy })
        }
      }
    })
  }
}

function gettersProxy (state: Object, getters: Object) {
  const proxyGetters = new Proxy({}, {
    get: function (obj, prop) {
      return getters[prop](state, proxyGetters)
    }
  })
  return { getters: proxyGetters }
}

function sideEffectStack (contractID: string): any[] {
  let stack = sideEffectStacks[contractID]
  if (!stack) {
    sideEffectStacks[contractID] = stack = []
  }
  return stack
}
