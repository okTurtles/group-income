'use strict'

import sbp from '~/shared/sbp.js'
import { GIMessage } from '~/shared/GIMessage.js'

// this must not be exported, but instead accessed through 'actionWhitelisted'
const whitelistedSelectors = {}

export const IS_CONSTRUCTOR = /^[\w.]+\/[^/]+\/(create|process)$/
export const ACTION_REGEX = /^(([\w.]+)\/([^/]+)\/(?:([^/]+)\/)?)process$/
// ACTION_REGEX.exec('gi.contracts/group/payment/process')
// 0 => 'gi.contracts/group/payment/process'
// 1 => 'gi.contracts/group/payment/'
// 2 => 'gi.contracts'
// 3 => 'group'
// 4 => 'payment'

// TODO: define a flow type for contracts
export function DefineContract (contract: Object) {
  const metadata = contract.metadata || { validate () {}, create: () => ({}) }
  const getters = contract.getters
  sbp('sbp/selectors/register', {
    // expose getters for Vuex integration and other conveniences
    [`${contract.name}/getters`]: () => getters,
    [`${contract.name}/state`]: contract.state
  })
  for (const action in contract.actions) {
    if (action.indexOf(contract.name) !== 0) {
      throw new Error(`contract action '${action}' must start with prefix: ${contract.name}`)
    }
    whitelistedSelectors[`${action}/process`] = true
    sbp('sbp/selectors/register', {
      [`${action}/create`]: async function (data: Object, contractID: string = null) {
        var previousHEAD = null
        var state = null
        if (contractID) {
          state = contract.state(contractID)
          previousHEAD = await sbp('backend/latestHash', contractID)
        } else if (!IS_CONSTRUCTOR.test(`${action}/create`)) {
          throw new Error(`contractID required when calling '${action}/create'`)
        }
        const meta = metadata.create()
        const gProxy = gettersProxy(state, getters)
        metadata.validate(meta, { state, ...gProxy, contractID })
        contract.actions[action].validate(data, { state, ...gProxy, meta, contractID })
        return GIMessage.create(contractID, previousHEAD, undefined, `${action}/process`, data, meta)
      },
      [`${action}/process`]: function (message: Object, state: Object) {
        const { meta, data, contractID } = message
        // TODO: optimize so that you're creating a proxy object only when needed
        const gProxy = gettersProxy(state, getters)
        state = state || contract.state(contractID)
        metadata.validate(meta, { state, ...gProxy, contractID })
        contract.actions[action].validate(data, { state, ...gProxy, meta, contractID })
        contract.actions[action].process(message, { state, ...gProxy })
      },
      // if this is undefined sbp will not register it
      [`${action}/process/sideEffect`]: contract.actions[action].sideEffect &&
      function (message: Object, state: Object) {
        state = state || contract.state(message.contractID)
        const gProxy = gettersProxy(state, getters)
        contract.actions[action].sideEffect(message, { state, ...gProxy })
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

export function actionWhitelisted (sel: string): boolean {
  return !!whitelistedSelectors[sel]
}

/*
A contract should have the following publicly readable messages:
- contract type
- key management related messages (add/remove authorized write keys, along with their capabilities)
- spoken contract protocol version (note: GIMessage has a 'version' field...)
*/

// TODO: Modify GIMessage to add base protocol ops
//       https://github.com/okTurtles/group-income-simple/issues/603
//       define a base set of protocol messages that are publicly readable
//       OP_CONTRACT - create a contract with a given name (publicly readable),
//                     and authorized keys, but all other data is encrypted.
//       OP_ACTION - an action is applied to the contract. its name and its
//                   data is encrypted.
//       OP_KEY_* - key related ops that determine who can write to this contract
//       OP_PROTOCOL_UPGRADE - bump the protocol version, clients that are less
//                             than this version cannot read or write
//       OP_PROP_SET
//       OP_PROP_DEL
//
// To make life easier so that you don't have to call hotUpdate and dynamically
// re-register vuex submodules, it might be possible to simply get rid of
// all mutations except for one, "mutate", and have it call an SBP selector
// that's passed in the state, effectively bypassing most of the vuex stuff.
