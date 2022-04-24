'use strict'

import sbp from '@sbp/spb'
import '@sbp/okturtles.events'
import '@sbp/okturtles.eventqueue'
import { CONTRACT_IS_SYNCING, CONTRACTS_MODIFIED, EVENT_HANDLED } from './internals.js'
import { createClient, NOTIFICATION_TYPE } from '~/shared/pubsub.js'
import { merge, cloneDeep, randomHexString, intersection, difference } from '~/frontend/utils/giLodash.js'
// TODO: rename this to ChelMessage
import { GIMessage } from './GIMessage.js'
import { ChelErrorUnrecoverable } from './errors.js'
import type { GIOpContract, GIOpActionUnencrypted } from './GIMessage.js'

// TODO: define ChelContractType for /defineContract

export type ChelRegParams = {
  contractName: string;
  data: Object;
  hooks?: {
    prepublishContract?: (GIMessage) => void;
    prepublish?: (GIMessage) => void;
    postpublish?: (GIMessage) => void;
  };
  publishOptions?: { maxAttempts: number };
}

export type ChelActionParams = {
  action: string;
  contractID: string;
  data: Object;
  hooks?: {
    prepublishContract?: (GIMessage) => void;
    prepublish?: (GIMessage) => void;
    postpublish?: (GIMessage) => void;
  };
  publishOptions?: { maxAttempts: number };
}

// TODO: include pubsub events here too?
export { CONTRACT_IS_SYNCING, CONTRACTS_MODIFIED, EVENT_HANDLED }

export const ACTION_REGEX: RegExp = /^((([\w.]+)\/([^/]+))(?:\/(?:([^/]+)\/)?)?)\w*/
// ACTION_REGEX.exec('gi.contracts/group/payment/process')
// 0 => 'gi.contracts/group/payment/process'
// 1 => 'gi.contracts/group/payment/'
// 2 => 'gi.contracts/group'
// 3 => 'gi.contracts'
// 4 => 'group'
// 5 => 'payment'

sbp('sbp/selectors/register', {
  // https://www.wordnik.com/words/chelonia
  // https://gitlab.okturtles.org/okturtles/group-income/-/wikis/E2E-Protocol/Framework.md#alt-names
  'chelonia/_init': function () {
    this.config = {
      decryptFn: JSON.parse, // override!
      encryptFn: JSON.stringify, // override!
      stateSelector: 'chelonia/private/state', // override to integrate with, for example, vuex
      whitelisted: (action: string): boolean => !!this.whitelistedActions[action],
      reactiveSet: (obj, key, value) => { obj[key] = value; return value }, // example: set to Vue.set
      reactiveDel: (obj, key) => { delete obj[key] },
      skipActionProcessing: false,
      connectionOptions: {
        maxRetries: Infinity, // See https://github.com/okTurtles/group-income/issues/1183
        reconnectOnTimeout: true, // can be enabled since we are not doing auth via web sockets
        timeout: 5000
      },
      hooks: {
        preHandleEvent: null, // async (message: GIMessage) => {}
        postHandleEvent: null, // async (message: GIMessage) => {}
        processError: null, // (e: Error, message: GIMessage) => {}
        sideEffectError: null, // (e: Error, message: GIMessage) => {}
        handleEventError: null, // (e: Error, message: GIMessage) => {}
        syncContractError: null, // (e: Error, contractID: string) => {}
        pubsubError: null // (e:Error, socket: Socket)
      }
    }
    this.state = {
      contracts: {}, // contractIDs => { type, HEAD } (contracts we've subscribed to)
      pending: [] // prevents processing unexpected data from a malicious server
    }
    this.contracts = {}
    this.whitelistedActions = {}
    this.sideEffectStacks = {} // [contractID]: Array<*>
    this.sideEffectStack = (contractID: string): Array<*> => {
      let stack = this.sideEffectStacks[contractID]
      if (!stack) {
        this.sideEffectStacks[contractID] = stack = []
      }
      return stack
    }
  },
  'chelonia/configure': function (config: Object) {
    merge(this.config, config)
  },
  'chelonia/connect': function (): Object {
    if (!this.config.connectionURL) throw new Error('config.connectionURL missing')
    if (!this.config.connectionOptions) throw new Error('config.connectionOptions missing')
    if (this.socket) {
      this.socket.destroy()
    }
    let pubsubURL = this.config.connectionURL
    if (process.env.NODE_ENV === 'development') {
      // This is temporarily used in development mode to help the server improve
      // its console output until we have a better solution. Do not use for auth.
      pubsubURL += `?debugID=${randomHexString(6)}`
    }
    this.socket = createClient(pubsubURL, {
      ...this.config.connectionOptions,
      messageHandlers: {
        [NOTIFICATION_TYPE.ENTRY] (msg) {
          // We MUST use 'chelonia/private/in/enqueueHandleEvent' to ensure handleEvent()
          // is called AFTER any currently-running calls to 'chelonia/contract/sync'
          // to prevent gi.db from throwing "bad previousHEAD" errors.
          // Calling via SBP also makes it simple to implement 'test/backend.js'
          sbp('chelonia/private/in/enqueueHandleEvent', GIMessage.deserialize(msg.data))
        },
        [NOTIFICATION_TYPE.APP_VERSION] (msg) {
          const ourVersion = process.env.GI_VERSION
          const theirVersion = msg.data

          if (ourVersion !== theirVersion) {
            sbp('okTurtles.events/emit', NOTIFICATION_TYPE.APP_VERSION, theirVersion)
          }
        }
      }
    })
    if (!this.contractsModifiedListener) {
      // Keep pubsub in sync (logged into the right "rooms") with 'state.contracts'
      this.contractsModifiedListener = (contracts) => {
        const client = this.socket
        const subscribedIDs = [...client.subscriptionSet]
        const currentIDs = Object.keys(contracts)
        const leaveSubscribed = intersection(subscribedIDs, currentIDs)
        const toUnsubscribe = difference(subscribedIDs, leaveSubscribed)
        const toSubscribe = difference(currentIDs, leaveSubscribed)
        // There is currently no need to tell other clients about our sub/unsubscriptions.
        const dontBroadcast = true
        try {
          for (const contractID of toUnsubscribe) {
            client.unsub(contractID, dontBroadcast)
          }
          for (const contractID of toSubscribe) {
            client.sub(contractID, dontBroadcast)
          }
        } catch (e) {
          console.error(`[chelonia] CONTRACTS_MODIFIED: error ${e.name} in pubsub: ${e.message}`, { toUnsubscribe, toSubscribe }, e)
          this.config.hooks.pubsubError?.(e, client)
        }
      }
      sbp('okTurtles.events/on', CONTRACTS_MODIFIED, this.contractsModifiedListener)
    }
    return this.socket
  },
  'chelonia/defineContract': function (contract: Object) {
    if (!ACTION_REGEX.exec(contract.name)) throw new Error(`bad contract name: ${contract.name}`)
    if (!contract.metadata) contract.metadata = { validate () {}, create: () => ({}) }
    if (!contract.getters) contract.getters = {}
    contract.state = (contractID) => sbp(this.stateSelector)[contractID]
    this.contracts[contract.name] = contract
    sbp('sbp/selectors/register', {
      // expose getters for Vuex integration and other conveniences
      [`${contract.name}/getters`]: () => contract.getters,
      // 2 ways to cause sideEffects to happen: by defining a sideEffect function in the
      // contract, or by calling /pushSideEffect w/async SBP call. Can also do both.
      [`${contract.name}/pushSideEffect`]: (contractID: string, asyncSbpCall: Array<*>) => {
        this.sideEffectStack(contractID).push(asyncSbpCall)
      }
    })
    for (const action in contract.actions) {
      contractFromAction(this.contracts, action) // ensure actions are appropriately named
      this.whitelistedActions[action] = true
      // TODO: automatically generate send actions here using `${action}/send`
      //       allow the specification of:
      //       - the optype (e.g. OP_ACTION_(UN)ENCRYPTED)
      //       - a localized error message
      //       - whatever keys should be passed in as well
      //       base it off of the design of encryptedAction()
      sbp('sbp/selectors/register', {
        [`${action}/process`]: (message: Object, state: Object) => {
          const { meta, data, contractID } = message
          // TODO: optimize so that you're creating a proxy object only when needed
          const gProxy = gettersProxy(state, contract.getters)
          state = state || contract.state(contractID)
          contract.metadata.validate(meta, { state, ...gProxy, contractID })
          contract.actions[action].validate(data, { state, ...gProxy, meta, contractID })
          contract.actions[action].process(message, { state, ...gProxy })
        },
        [`${action}/sideEffect`]: async (message: Object, state: ?Object) => {
          const sideEffects = this.sideEffectStack(message.contractID)
          while (sideEffects.length > 0) {
            const sideEffect = sideEffects.shift()
            try {
              await sbp(...sideEffect)
            } catch (e) {
              console.error(`[chelonia] ERROR: '${e.name}' ${e.message}, for pushed sideEffect of ${message.description()}:`, sideEffect)
              this.sideEffectStacks[message.contractID] = [] // clear the side effects
              throw e
            }
          }
          if (contract.actions[action].sideEffect) {
            state = state || contract.state(message.contractID)
            const gProxy = gettersProxy(state, contract.getters)
            await contract.actions[action].sideEffect(message, { state, ...gProxy })
          }
        }
      })
    }
  },
  // 'chelonia/contract' - selectors related to injecting remote data and monitoring contracts
  'chelonia/contract/sync': function (contractIDs: string | string[]): Promise<*> {
    const listOfIds = typeof contractIDs === 'string' ? [contractIDs] : contractIDs
    return Promise.all(listOfIds.map(contractID => {
      // enqueue this invocation in a serial queue to ensure
      // handleEvent does not get called on contractID while it's syncing,
      // but after it's finished. This is used in tandem with
      // queuing the 'chelonia/private/in/handleEvent' selector, defined below.
      // This prevents handleEvent getting called with the wrong previousHEAD for an event.
      return sbp('okTurtles.eventQueue/queueEvent', contractID, [
        'chelonia/private/in/syncContract', contractID
      ])
    }))
  },
  // safer version of removeImmediately that waits to finish processing events for contractIDs
  'chelonia/contract/remove': function (contractIDs: string | string[]): Promise<*> {
    const listOfIds = typeof contractIDs === 'string' ? [contractIDs] : contractIDs
    return Promise.all(listOfIds.map(contractID => {
      return sbp('okTurtles.eventQueue/queueEvent', contractID, [
        'chelonia/contract/removeImmediately', contractID
      ])
    }))
  },
  'chelonia/contract/removeImmediately': function (contractID: string) {
    const state = sbp(this.stateSelector)
    this.config.reactiveDel(state, contractID)
    // calling this will make pubsub unsubscribe for events on `contractID`
    sbp('okTurtles.events/emit', CONTRACTS_MODIFIED, state.contracts)
  },
  'chelonia/latestContractState': async (contractID: string) => {
    const events = await sbp('chelonia/private/out/eventsSince', contractID, contractID)
    let state = {}
    // fast-path
    try {
      for (const event of events) {
        await sbp('chelonia/private/in/processMessage', GIMessage.deserialize(event), state)
      }
      return state
    } catch (e) {
      console.warn(`[chelonia] latestContractState(${contractID}): fast-path failed due to ${e.name}: ${e.message}`)
      state = {}
    }
    // more error-tolerant but slower due to cloning state on each message
    for (const event of events) {
      const stateCopy = cloneDeep(state)
      try {
        await sbp('chelonia/private/in/processMessage', GIMessage.deserialize(event), state)
      } catch (e) {
        console.warn(`[chelonia] latestContractState: '${e.name}': ${e.message} processing:`, event)
        if (e instanceof ChelErrorUnrecoverable) throw e
        state = stateCopy
      }
    }
    return state
  },
  // 'chelonia/out' - selectors that send data out to the server
  'chelonia/out/registerContract': async function (params: ChelRegParams) {
    const { contractName, hooks, publishOptions } = params
    const contract = this.contracts[contractName]
    if (!contract) throw new Error(`contract not defined: ${contractName}`)
    const contractMsg = GIMessage.createV1_0(null, null, [
      GIMessage.OP_CONTRACT,
      ({
        type: contractName,
        keyJSON: 'TODO: add group public key here'
      }: GIOpContract)
    ])
    hooks && hooks.prepublishContract && hooks.prepublishContract(contractMsg)
    await sbp('chelonia/private/out/publishEvent', contractMsg, publishOptions)
    const msg = await sbp('chelonia/out/actionEncrypted', {
      action: contractName,
      contractID: contractMsg.hash(),
      data: params.data,
      hooks,
      publishOptions
    })
    return msg
  },
  // all of these functions will do both the creation of the GIMessage
  // and the sending of it via 'chelonia/private/out/publishEvent'
  'chelonia/out/actionEncrypted': function (params: ChelActionParams): Promise<GIMessage> {
    return outEncryptedOrUnencryptedAction.call(this, GIMessage.OP_ACTION_ENCRYPTED, params)
  },
  'chelonia/out/actionUnencrypted': function (params: ChelActionParams): Promise<GIMessage> {
    return outEncryptedOrUnencryptedAction.call(this, GIMessage.OP_ACTION_UNENCRYPTED, params)
  },
  'chelonia/out/keyAdd': async function () {

  },
  'chelonia/out/keyDel': async function () {

  },
  'chelonia/out/protocolUpgrade': async function () {

  },
  'chelonia/out/propSet': async function () {

  },
  'chelonia/out/propDel': async function () {

  }
})

function contractFromAction (contracts: Object, action: string): Object {
  const regexResult = ACTION_REGEX.exec(action)
  const contract = contracts[(regexResult && regexResult[2]) || null]
  if (!contract) throw new Error(`no contract for action named: ${action}`)
  return contract
}

async function outEncryptedOrUnencryptedAction (
  opType: 'ae' | 'au',
  params: ChelActionParams
) {
  const { action, contractID, data, hooks, publishOptions } = params
  const contract = contractFromAction(this.contracts, action)
  const state = contract.state(contractID)
  const previousHEAD = await sbp('chelonia/private/out/latestHash', contractID)
  const meta = contract.metadata.create()
  const gProxy = gettersProxy(state, contract.getters)
  contract.metadata.validate(meta, { state, ...gProxy, contractID })
  contract.actions[action].validate(data, { state, ...gProxy, meta, contractID })
  const unencMessage = ({ action, data, meta }: GIOpActionUnencrypted)
  const message = GIMessage.createV1_0(contractID, previousHEAD, [
    opType,
    opType === GIMessage.OP_ACTION_UNENCRYPTED ? unencMessage : this.config.encryptFn(unencMessage)
  ]
    // TODO: add the signature function here to sign the message whether encrypted or not
  )
  hooks && hooks.prepublish && hooks.prepublish(message)
  await sbp('chelonia/private/out/publishEvent', message, publishOptions)
  hooks && hooks.postpublish && hooks.postpublish(message)
  return message
}

// The gettersProxy is what makes Vue-like getters possible. In other words,
// we want to make sure that the getter functions that we defined in each
// contract get passed the 'state' when a getter is accessed.
// The only way to pass in the state is by creating a Proxy object that does
// that for us. This allows us to maintain compatibility with Vue.js and integrate
// the contract getters into the Vue-facing getters.
function gettersProxy (state: Object, getters: Object) {
  const proxyGetters = new Proxy({}, {
    get (target, prop) {
      return getters[prop](state, proxyGetters)
    }
  })
  return { getters: proxyGetters }
}
