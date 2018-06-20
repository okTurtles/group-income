'use strict'

// returns an object containing any constants, and, in the case of the
// constructor mutation, the vuex submodule under the vuexModule key.
export function DefineContract (contract) {
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
    var {constructor, validate, constants, vuex} = contract[name]

    exportedObject[name] = {validate}

    if (constructor) {
      if (contractName) {
        throw new Error('only one constructor per contract!')
      }
      contractName = name
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
      vuex.mutation(state, data)
    }
    // set the action (if one exists)
    // !! IMPORANT!!
    // Actions MUST NOT modify contract state!
    // They MUST NOT call 'commit'!
    // This is critical to the function of that latest contract hash.
    // They should only coordinate the actions of outside contracts.
    // Otherwise `latestContractState` and `handleEvent` will not produce same state!
    if (vuex.action) {
      vuexModule.actions[name] = vuex.action
    } else {
      // since state.js calls actions regardless of whether they exist, define
      // an empty action that does nothing if no action is defined
      vuexModule.actions[name] = async function () {}
    }
    // set any getters
    if (vuex.getters) {
      for (let getterName of vuex.getters) {
        vuexModule.getters[getterName] = vuex.getters[getterName]
      }
    }
  }
  if (!contractName) {
    throw new Error('contract constructor is missing!')
  }
  // attach vuexModule to constructor function
  exportedObject[contractName].vuexModule = vuexModule
  return exportedObject
}
