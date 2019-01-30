'use strict'

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

  for (let name in contract) {
    // NOTE: very important that we use 'let' here instead of 'var'!
    //       if we use 'var' then 'vuexModuleConfig.mutation' below will not be properly set
    //       for the different mutation functions!
    let { isConstructor, validate, constants, vuexModuleConfig } = contract[name]

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
      for (let constant in constants) {
        exportedObject[name][constant] = constants[constant]
      }
    }
    // validation is performed both when creating a GIMessage
    // and when that GIMessage is received and is applied as a mutation
    vuexModule.mutations[name] = function (state, data) {
      validate(data.data)
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
      for (let getterName in vuexModuleConfig.getters) {
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
