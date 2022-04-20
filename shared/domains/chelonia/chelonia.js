'use strict'

import sbp from '~/shared/sbp.js'
import '~/shared/domains/okTurtles/events.js'
import '~/shared/domains/okTurtles/eventQueue.js'
import { createClient, NOTIFICATION_TYPE } from '~/shared/pubsub.js'
import { b64ToStr } from '~/shared/functions.js'
import { merge, randomHexString } from '~/frontend/utils/giLodash.js'
import { GIMessage, sanityCheck } from './GIMessage.js'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'
import type { GIOpContract, GIOpType, GIOpActionEncrypted, GIOpActionUnencrypted, GIOpPropSet, GIOpKeyAdd } from './GIMessage.js'

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

export const CONTRACT_IS_SYNCING = 'contract-is-syncing'

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
      stateFn: () => this.state, // can override to integrate with, for example, vuex
      whitelisted: (action: string): boolean => !!this.whitelistedActions[action],
      publishSelector: 'backend/publishLogEntry',
      skipActionProcessing: false,
      connectionOptions: {
        maxRetries: Infinity, // See https://github.com/okTurtles/group-income/issues/1183
        reconnectOnTimeout: true, // can be enabled since we are not doing auth via web sockets
        timeout: 5000
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
          // We MUST use 'chelonia/in.private/enqueueHandleEvent' to ensure handleEvent()
          // is called AFTER any currently-running calls to syncContractWithServer()
          // to prevent gi.db from throwing "bad previousHEAD" errors.
          // Calling via SBP also makes it simple to implement 'test/backend.js'
          sbp('chelonia/in.private/enqueueHandleEvent', GIMessage.deserialize(msg.data))
        },
        [NOTIFICATION_TYPE.APP_VERSION] (msg) {
          const ourVersion = process.env.GI_VERSION
          const theirVersion = msg.data

          if (ourVersion !== theirVersion) {
            // TODO: replace all instances of GI_UPDATE_AVAILABLE with NOTIFICATION_TYPE.APP_VERSION
            sbp('okTurtles.events/emit', NOTIFICATION_TYPE.APP_VERSION, theirVersion)
          }
        }
      }
    })
    return this.socket
  },
  'chelonia/defineContract': function (contract: Object) {
    if (!ACTION_REGEX.exec(contract.name)) throw new Error(`bad contract name: ${contract.name}`)
    if (!contract.metadata) contract.metadata = { validate () {}, create: () => ({}) }
    if (!contract.getters) contract.getters = {}
    this.contracts[contract.name] = contract
    sbp('sbp/selectors/register', {
      // expose getters for Vuex integration and other conveniences
      [`${contract.name}/getters`]: () => contract.getters,
      [`${contract.name}/state`]: contract.state,
      // 2 ways to cause sideEffects to happen: by defining a sideEffect function in the
      // contract, or by calling /pushSideEffect w/async SBP call. Can also do both.
      [`${contract.name}/pushSideEffect`]: (contractID: string, asyncSbpCall: Array<*>) => {
        this.sideEffectStack(contractID).push(asyncSbpCall)
      }
    })
    for (const action in contract.actions) {
      contractFromAction(this.contracts, action) // ensure actions are appropriately named
      this.whitelistedActions[action] = true
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
            await sbp(...sideEffects.shift())
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
    await sbp(this.config.publishSelector, contractMsg, publishOptions)
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
  // and the sending of it via this.config.publishSelector
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

  },
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
  'chelonia/in/sync': function (contractIDs: string | string[]) {
    const listOfIds = typeof contractIDs === 'string' ? [contractIDs] : contractIDs
    return Promise.all(listOfIds.map(contractID => {
      // enqueue this invocation in a serial queue to ensure
      // handleEvent does not get called on contractID while it's syncing,
      // but after it's finished. This is used in tandem with
      // queuing the 'chelonia/in.private/handleEvent' selector, defined below.
      // This prevents handleEvent getting called with the wrong previousHEAD for an event.
      return sbp('okTurtles.eventQueue/queueEvent', contractID, [
        'chelonia/in.private/syncContract', contractID
      ])
    }))
  },
  // --------- BEGIN PRIVATE SELECTORS --------------------
  //     DO NOT CALL ANY OF THESE YOURSELF!
  'chelonia/in.private/enqueueHandleEvent': function (event: GIMessage) {
    // make sure handleEvent is called AFTER any currently-running invocations
    // to syncContractWithServer(), to prevent gi.db from throwing
    // "bad previousHEAD" errors
    return sbp('okTurtles.eventQueue/queueEvent', event.contractID(), [
      'chelonia/in.private/handleEvent', event
    ])
  },
  'chelonia/in.private/syncContract': async function (contractID: string) {
    const state = this.config.stateFn()
    const latest = await sbp('chelonia/out.private/latestHash', contractID)
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
      const events = await sbp('chelonia/out.private/eventsSince', contractID, recent || contractID)
      // remove the first element in cases where we are not getting the contract for the first time
      state.contracts[contractID] && events.shift()
      for (let i = 0; i < events.length; i++) {
        // this must be called directly, instead of via enqueueHandleEvent
        await sbp('chelonia/in.private/handleEvent', GIMessage.deserialize(events[i]))
      }
    } else {
      console.debug(`Contract ${contractID} was already synchronized`)
    }
    sbp('okTurtles.events/emit', CONTRACT_IS_SYNCING, contractID, false)
  },
  'chelonia/in.private/handleEvent': function () {
    const contractID = e.contractID()
    if (!vuexState[contractID]) {
      vuexState[contractID] = {}
    }
    // TODO: we should be able to avoid caring about store.registerModule
    //       the one thing we need to figure out how to do is deal with Vue.set
    sbp('chelonia/in/processMessage', e, vuexState[contractID])
    sbp('okTurtles.events/emit', e.hash(), e)
  },
  'chelonia/out.private/latestHash': (contractID: string) => {
    return fetch(`${sbp('okTurtles.data/get', 'API_URL')}/latestHash/${contractID}`)
      .then(handleFetchResult('text'))
  },
  // TODO: r.body is a stream.Transform, should we use a callback to process
  //       the events one-by-one instead of converting to giant json object?
  //       however, note if we do that they would be processed in reverse...
  'chelonia/out.private/eventsSince': async (contractID: string, since: string) => {
    const events = await fetch(`${sbp('okTurtles.data/get', 'API_URL')}/events/${contractID}/${since}`)
      .then(handleFetchResult('json'))
    if (Array.isArray(events)) {
      return events.reverse().map(b64ToStr)
    }
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
  const previousHEAD = await sbp('chelonia/out.private/latestHash', contractID)
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
  await sbp(this.config.publishSelector, message, publishOptions)
  hooks && hooks.postpublish && hooks.postpublish(message)
  return message
}

const notImplemented = (v) => {
  throw new Error(`chelonia: action not implemented to handle: ${JSON.stringify(v)}.`)
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
