'use strict'

import sbp from '~/shared/sbp.js'
import { GIMessage } from '~/shared/GIMessage.js'

// this must not be exported, but instead accessed through 'actionWhitelisted'
const whitelistedSelectors = {}

export const CONTRACT_REGEX = /^(([\w.]+)\/([^/]+)\/(?:([^/]+)\/)?)process$/

// TODO: define a flow type for contracts
export function DefineContract (contract: Object) {
  const meta = contract.metadata || { validate () {}, create: () => ({}) }
  whitelistedSelectors[`${contract.name}/process`] = true
  sbp('sbp/selectors/register', {
    [`${contract.name}/create`]: function (data) {
      const metadata = meta.create()
      meta.validate(metadata)
      contract.contract.validate(data, { state: null, meta: metadata })
      return GIMessage.create(null, null, undefined, `${contract.name}/process`, data, metadata)
    },
    [`${contract.name}/process`]: function (state, message) {
      meta.validate(message.meta)
      contract.contract.validate(message.data, { state, meta: message.meta })
      contract.contract.process(state, message)
    }
  })
  for (const action in contract.actions) {
    if (action.indexOf(contract.name) !== 0) {
      throw new Error(`contract action '${action}' must start with prefix: ${contract.name}`)
    }
    whitelistedSelectors[`${action}/process`] = true
    sbp('sbp/selectors/register', {
      [`${action}/create`]: async function (data, contractID) {
        if (!contractID) {
          throw new Error(`A contractID as 2nd parameter is required when calling '${action}/create'`)
        }
        const metadata = meta.create()
        // TODO: this is hackish and not library friendly, fix in #749
        const state = sbp('state/vuex/state')[contractID]
        meta.validate(metadata)
        contract.actions[action].validate(data, { state, meta: metadata })
        const previousHEAD = await sbp('backend/latestHash', contractID)
        return GIMessage.create(contractID, previousHEAD, undefined, `${action}/process`, data, metadata)
      },
      [`${action}/process`]: function (state, message) {
        meta.validate(message.meta)
        contract.actions[action].validate(message.data, { state, meta: message.meta })
        contract.actions[action].process(state, message)
      },
      // if this is undefined sbp will not register it
      [`${action}/process/sideEffect`]: contract.actions[action].sideEffect
    })
  }
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
