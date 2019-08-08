'use strict'

import sbp from '~/shared/sbp.js'
import { GIMessage } from '~/shared/GIMessage.js'

// TODO: define a flow type for contracts
export function DefineContract (contract: Object) {
  const meta = contract.metadata || { validate () {}, create: () => ({}) }
  sbp('sbp/selectors/register', {
    [`${contract.name}/create`]: function (data) {
      const metadata = meta.create()
      contract.contract.validate(data)
      meta.validate(metadata)
      return GIMessage.create(null, null, undefined, `${contract.name}/process`, data, metadata)
    },
    [`${contract.name}/process`]: function (state, message) {
      contract.contract.validate(message.data)
      meta.validate(message.meta)
      contract.contract.process(state, message)
    }
  })
  for (const action in contract.actions) {
    if (action.indexOf(contract.name) !== 0) {
      throw new Error(`contract action '${action}' must start with prefix: ${contract.name}`)
    }
    sbp('sbp/selectors/register', {
      [`${action}/create`]: async function (data, contractID) {
        const metadata = meta.create()
        contract.actions[action].validate(data)
        meta.validate(metadata)
        const previousHEAD = await sbp('backend/latestHash', contractID)
        return GIMessage.create(contractID, previousHEAD, undefined, `${action}/process`, data, metadata)
      },
      [`${action}/process`]: function (state, message) {
        contract.actions[action].validate(message.data)
        meta.validate(message.meta)
        contract.actions[action].process(state, message)
      }
    })
  }
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

/*
// returns an object containing any constants, and, in the case of the
// constructor mutation, the vuex submodule under the vuexModule key.
export function DefineContract (contract: Object) {
  var vuexModule = {
    // vuex module namespaced under this contract's hash
    // see details: https://vuex.vuejs.org/en/modules.html
    namespaced: true,
    state: {},
    mutations: {},
    actions: {},
    getters: {}
  }
  var exportedObject = {}
  var contractName

  for (const name in contract) {
    // NOTE: very important that we use 'let' here instead of 'var'!
    //       if we use 'var' then 'vuexModuleConfig.mutation' below will not be properly set
    //       for the different mutation functions!
    const { isConstructor, validate, constants, vuexModuleConfig } = contract[name]
    const validateMeta = contract[name].validateMeta || objectOf({})

    // this validate gets called in handleEvent and by 'gi/contract/create(-action)'
    exportedObject[name] = { validate }

    // NOTE: must check explicitely if 'isConstructor' is true
    //       because that key is defined by default on objects as some function...
    if (isConstructor === true) {
      if (contractName) {
        throw new Error(`one constructor per contract! ${contractName} vs ${name}`)
      }
      contractName = name
      // constructors are allowed to have an initialState key on the vuex object
      if (vuexModuleConfig.initialState) {
        vuexModule.state = vuexModuleConfig.initialState
      }
    } else if (vuexModuleConfig.initialState) {
      throw new Error(`initialState cannot be defined in non-constructor: ${name}`)
    }
    // if any constants are defined make them easily accessible via exported object
    if (constants) {
      for (const constant in constants) {
        exportedObject[name][constant] = constants[constant]
      }
    }
    // validation is performed both when creating a GIMessage
    // and when that GIMessage is received and is applied as a mutation
    vuexModule.mutations[name] = function (state, data) {
      validate(data.data)
      validateMeta(data.meta)
      vuexModuleConfig.mutation(state, data)
    }
    // set the action (if one exists)
    // !! IMPORANT!!
    // Actions MUST NOT modify contract state!
    // They MUST NOT call 'commit'!
    // This is critical to the function of that latest contract hash.
    // They should only coordinate the actions of outside contracts.
    // Otherwise `latestContractState` and `handleEvent` will not produce same state!
    if (vuexModuleConfig.action) {
      vuexModule.actions[name] = vuexModuleConfig.action
    } else {
      // since state.js calls actions regardless of whether they exist, define
      // an empty action that does nothing if no action is defined
      vuexModule.actions[name] = async function () {}
    }
    // set any getters
    if (vuexModuleConfig.getters) {
      for (const getterName in vuexModuleConfig.getters) {
        vuexModule.getters[getterName] = vuexModuleConfig.getters[getterName]
      }
    }
  }
  if (!contractName) {
    throw new Error('contract constructor is missing!')
  }
  exportedObject[contractName].vuexModule = vuexModule
  return exportedObject
}
*/
