'use strict'

import sbp from '@sbp/sbp'
import '@sbp/okturtles.events'
import '@sbp/okturtles.eventqueue'
import './internals.js'
import { CONTRACTS_MODIFIED, CONTRACT_REGISTERED } from './events.js'
import { createClient, NOTIFICATION_TYPE } from '~/shared/pubsub.js'
import { merge, cloneDeep, randomHexString, intersection, difference } from '~/frontend/model/contracts/shared/giLodash.js'
import { b64ToStr } from '~/shared/functions.js'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'
// TODO: rename this to ChelMessage
import { GIMessage } from './GIMessage.js'
import { ChelErrorUnrecoverable } from './errors.js'
import type { GIOpContract, GIOpActionUnencrypted } from './GIMessage.js'

// TODO: define ChelContractType for /defineContract

export type ChelRegParams = {
  contractName: string;
  server?: string; // TODO: implement!
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
  server?: string; // TODO: implement!
  contractID: string;
  data: Object;
  hooks?: {
    prepublishContract?: (GIMessage) => void;
    prepublish?: (GIMessage) => void;
    postpublish?: (GIMessage) => void;
  };
  publishOptions?: { maxAttempts: number };
}

export { GIMessage }

export const ACTION_REGEX: RegExp = /^((([\w.]+)\/([^/]+))(?:\/(?:([^/]+)\/)?)?)\w*/
// ACTION_REGEX.exec('gi.contracts/group/payment/process')
// 0 => 'gi.contracts/group/payment/process'
// 1 => 'gi.contracts/group/payment/'
// 2 => 'gi.contracts/group'
// 3 => 'gi.contracts'
// 4 => 'group'
// 5 => 'payment'

export default (sbp('sbp/selectors/register', {
  // https://www.wordnik.com/words/chelonia
  // https://gitlab.okturtles.org/okturtles/group-income/-/wikis/E2E-Protocol/Framework.md#alt-names
  'chelonia/_init': function () {
    this.config = {
      // TODO: handle connecting to multiple servers for federation
      connectionURL: null, // override!
      decryptFn: JSON.parse, // override!
      encryptFn: JSON.stringify, // override!
      stateSelector: 'chelonia/private/state', // override to integrate with, for example, vuex
      contracts: {
        defaults: {
          modules: {}, // '<module name>' => resolved module import
          exposedGlobals: {},
          allowedDomains: [],
          allowedSelectors: [],
          preferSlim: false
        },
        overrides: {}, // override default values per-contract
        manifests: {} // override! contract names => manifest hashes
      },
      whitelisted: (action: string): boolean => !!this.whitelistedActions[action],
      reactiveSet: (obj, key, value) => { obj[key] = value; return value }, // example: set to Vue.set
      reactiveDel: (obj, key) => { delete obj[key] },
      skipActionProcessing: false,
      skipSideEffects: false,
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
    this.manifestToContract = {}
    this.whitelistedActions = {}
    this.currentSyncs = {}
    this.sideEffectStacks = {} // [contractID]: Array<*>
    this.sideEffectStack = (contractID: string): Array<*> => {
      let stack = this.sideEffectStacks[contractID]
      if (!stack) {
        this.sideEffectStacks[contractID] = stack = []
      }
      return stack
    }
  },
  'chelonia/config': function () {
    return cloneDeep(this.config)
  },
  'chelonia/configure': async function (config: Object) {
    merge(this.config, config)
    // merge will strip the hooks off of config.hooks when merging from the root of the object
    // because they are functions and cloneDeep doesn't clone functions
    Object.assign(this.config.hooks, config.hooks || {})
    // using Object.assign here instead of merge to avoid stripping away imported modules
    Object.assign(this.config.contracts.defaults, config.contracts.defaults || {})
    const manifests = this.config.contracts.manifests
    console.debug('[chelonia] preloading manifests:', Object.keys(manifests))
    for (const contractName in manifests) {
      await sbp('chelonia/private/loadManifest', manifests[contractName])
    }
  },
  // TODO: allow connecting to multiple servers at once
  'chelonia/connect': function (): Object {
    if (!this.config.connectionURL) throw new Error('config.connectionURL missing')
    if (!this.config.connectionOptions) throw new Error('config.connectionOptions missing')
    if (this.pubsub) {
      this.pubsub.destroy()
    }
    let pubsubURL = this.config.connectionURL
    if (process.env.NODE_ENV === 'development') {
      // This is temporarily used in development mode to help the server improve
      // its console output until we have a better solution. Do not use for auth.
      pubsubURL += `?debugID=${randomHexString(6)}`
    }
    this.pubsub = createClient(pubsubURL, {
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
      this.contractsModifiedListener = () => sbp('chelonia/pubsub/update')
      sbp('okTurtles.events/on', CONTRACTS_MODIFIED, this.contractsModifiedListener)
    }
    return this.pubsub
  },
  'chelonia/defineContract': function (contract: Object) {
    if (!ACTION_REGEX.exec(contract.name)) throw new Error(`bad contract name: ${contract.name}`)
    if (!contract.metadata) contract.metadata = { validate () {}, create: () => ({}) }
    if (!contract.getters) contract.getters = {}
    contract.state = (contractID) => sbp(this.config.stateSelector)[contractID]
    contract.manifest = this.defContractManifest
    contract.sbp = this.defContractSBP
    this.defContractSelectors = []
    this.defContract = contract
    this.defContractSelectors.push(...sbp('sbp/selectors/register', {
      // expose getters for Vuex integration and other conveniences
      [`${contract.manifest}/${contract.name}/getters`]: () => contract.getters,
      // 2 ways to cause sideEffects to happen: by defining a sideEffect function in the
      // contract, or by calling /pushSideEffect w/async SBP call. Can also do both.
      [`${contract.manifest}/${contract.name}/pushSideEffect`]: (contractID: string, asyncSbpCall: Array<*>) => {
        // if this version of the contract is pushing a sideEffect to a function defined by the
        // contract itself, make sure that it calls the same version of the sideEffect
        const [sel] = asyncSbpCall
        if (sel.startsWith(contract.name)) {
          asyncSbpCall[0] = `${contract.manifest}/${sel}`
        }
        this.sideEffectStack(contractID).push(asyncSbpCall)
      }
    }))
    for (const action in contract.actions) {
      contractNameFromAction(action) // ensure actions are appropriately named
      this.whitelistedActions[action] = true
      // TODO: automatically generate send actions here using `${action}/send`
      //       allow the specification of:
      //       - the optype (e.g. OP_ACTION_(UN)ENCRYPTED)
      //       - a localized error message
      //       - whatever keys should be passed in as well
      //       base it off of the design of encryptedAction()
      this.defContractSelectors.push(...sbp('sbp/selectors/register', {
        [`${contract.manifest}/${action}/process`]: (message: Object, state: Object) => {
          const { meta, data, contractID } = message
          // TODO: optimize so that you're creating a proxy object only when needed
          const gProxy = gettersProxy(state, contract.getters)
          state = state || contract.state(contractID)
          contract.metadata.validate(meta, { state, ...gProxy, contractID })
          contract.actions[action].validate(data, { state, ...gProxy, meta, contractID })
          contract.actions[action].process(message, { state, ...gProxy })
        },
        // 'mutation' is an object that's similar to 'message', but not identical
        [`${contract.manifest}/${action}/sideEffect`]: async (mutation: Object, state: ?Object) => {
          const sideEffects = this.sideEffectStack(mutation.contractID)
          while (sideEffects.length > 0) {
            const sideEffect = sideEffects.shift()
            try {
              await contract.sbp(...sideEffect)
            } catch (e) {
              console.error(`[chelonia] ERROR: '${e.name}' ${e.message}, for pushed sideEffect of ${mutation.description}:`, sideEffect)
              this.sideEffectStacks[mutation.contractID] = [] // clear the side effects
              throw e
            }
          }
          if (contract.actions[action].sideEffect) {
            state = state || contract.state(mutation.contractID)
            const gProxy = gettersProxy(state, contract.getters)
            await contract.actions[action].sideEffect(mutation, { state, ...gProxy })
          }
        }
      }))
    }
    for (const method in contract.methods) {
      this.defContractSelectors.push(...sbp('sbp/selectors/register', {
        [`${contract.manifest}/${method}`]: contract.methods[method]
      }))
    }
    sbp('okTurtles.events/emit', CONTRACT_REGISTERED, contract)
  },
  'chelonia/queueInvocation': sbp('sbp/selectors/fn', 'okTurtles.eventQueue/queueEvent'),
  // call this manually to resubscribe/unsubscribe from contracts as needed
  // if you are using a custom stateSelector and reload the state (e.g. upon login)
  'chelonia/pubsub/update': function () {
    const { contracts } = sbp(this.config.stateSelector)
    const client = this.pubsub
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
      console.error(`[chelonia] pubsub/update: error ${e.name}: ${e.message}`, { toUnsubscribe, toSubscribe }, e)
      this.config.hooks.pubsubError?.(e, client)
    }
  },
  // resolves when all pending actions for these contractID(s) finish
  'chelonia/contract/wait': function (contractIDs?: string | string[]): Promise<*> {
    const listOfIds = contractIDs
      ? (typeof contractIDs === 'string' ? [contractIDs] : contractIDs)
      : Object.keys(sbp(this.config.stateSelector).contracts)
    return Promise.all(listOfIds.map(cID => {
      return sbp('chelonia/queueInvocation', cID, ['chelonia/private/noop'])
    }))
  },
  // 'chelonia/contract' - selectors related to injecting remote data and monitoring contracts
  // TODO: add an optional parameter to "retain" the contract (see #828)
  'chelonia/contract/sync': function (contractIDs: string | string[]): Promise<*> {
    const listOfIds = typeof contractIDs === 'string' ? [contractIDs] : contractIDs
    return Promise.all(listOfIds.map(contractID => {
      // enqueue this invocation in a serial queue to ensure
      // handleEvent does not get called on contractID while it's syncing,
      // but after it's finished. This is used in tandem with
      // queuing the 'chelonia/private/in/handleEvent' selector, defined below.
      // This prevents handleEvent getting called with the wrong previousHEAD for an event.
      return sbp('chelonia/queueInvocation', contractID, [
        'chelonia/private/in/syncContract', contractID
      ]).catch((err) => {
        console.error(`[chelonia] failed to sync ${contractID}:`, err)
        throw err // re-throw the error
      })
    }))
  },
  'chelonia/contract/isSyncing': function (contractID: string, { firstSync = false } = {}): boolean {
    const isSyncing = !!this.currentSyncs[contractID]
    return firstSync
      ? isSyncing && this.currentSyncs[contractID].firstSync
      : isSyncing
  },
  // TODO: implement 'chelonia/contract/release' (see #828)
  // safer version of removeImmediately that waits to finish processing events for contractIDs
  'chelonia/contract/remove': function (contractIDs: string | string[]): Promise<*> {
    const listOfIds = typeof contractIDs === 'string' ? [contractIDs] : contractIDs
    return Promise.all(listOfIds.map(contractID => {
      return sbp('chelonia/queueInvocation', contractID, [
        'chelonia/contract/removeImmediately', contractID
      ])
    }))
  },
  // Warning: avoid using this unless you know what you're doing. Prefer using /remove.
  'chelonia/contract/removeImmediately': function (contractID: string) {
    const state = sbp(this.config.stateSelector)
    this.config.reactiveDel(state.contracts, contractID)
    this.config.reactiveDel(state, contractID)
    // calling this will make pubsub unsubscribe for events on `contractID`
    sbp('okTurtles.events/emit', CONTRACTS_MODIFIED, state.contracts)
  },
  // TODO: r.body is a stream.Transform, should we use a callback to process
  //       the events one-by-one instead of converting to giant json object?
  //       however, note if we do that they would be processed in reverse...
  'chelonia/out/eventsSince': async function (contractID: string, since: string) {
    const events = await fetch(`${this.config.connectionURL}/eventsSince/${contractID}/${since}`)
      .then(handleFetchResult('json'))
    if (Array.isArray(events)) {
      return events.reverse().map(b64ToStr)
    }
  },
  'chelonia/out/latestHash': function (contractID: string) {
    return fetch(`${this.config.connectionURL}/latestHash/${contractID}`, {
      cache: 'no-store'
    }).then(handleFetchResult('text'))
  },
  'chelonia/out/eventsBefore': async function (before: string, limit: number) {
    if (limit <= 0) {
      console.error('[chelonia] invalid params error: "limit" needs to be positive integer')
      return
    }

    const events = await fetch(`${this.config.connectionURL}/eventsBefore/${before}/${limit}`)
      .then(handleFetchResult('json'))
    if (Array.isArray(events)) {
      return events.reverse().map(b64ToStr)
    }
  },
  'chelonia/out/eventsBetween': async function (startHash: string, endHash: string, offset: number = 0) {
    if (offset < 0) {
      console.error('[chelonia] invalid params error: "offset" needs to be positive integer or zero')
      return
    }

    const events = await fetch(`${this.config.connectionURL}/eventsBetween/${startHash}/${endHash}?offset=${offset}`)
      .then(handleFetchResult('json'))
    if (Array.isArray(events)) {
      return events.reverse().map(b64ToStr)
    }
  },
  'chelonia/latestContractState': async function (contractID: string) {
    const events = await sbp('chelonia/out/eventsSince', contractID, contractID)
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
    const manifestHash = this.config.contracts.manifests[contractName]
    const contractInfo = this.manifestToContract[manifestHash]
    if (!contractInfo) throw new Error(`contract not defined: ${contractName}`)
    const contractMsg = GIMessage.createV1_0(null, null,
      [
        GIMessage.OP_CONTRACT,
        ({
          type: contractName,
          keyJSON: 'TODO: add group public key here'
        }: GIOpContract)
      ],
      manifestHash
    )
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
}): string[])

function contractNameFromAction (action: string): string {
  const regexResult = ACTION_REGEX.exec(action)
  const contractName = regexResult && regexResult[2]
  if (!contractName) throw new Error(`Poorly named action '${action}': missing contract name.`)
  return contractName
}

async function outEncryptedOrUnencryptedAction (
  opType: 'ae' | 'au',
  params: ChelActionParams
) {
  const { action, contractID, data, hooks, publishOptions } = params
  const contractName = contractNameFromAction(action)
  const manifestHash = this.config.contracts.manifests[contractName]
  const { contract } = this.manifestToContract[manifestHash]
  const state = contract.state(contractID)
  const previousHEAD = await sbp('chelonia/out/latestHash', contractID)
  const meta = await contract.metadata.create()
  const gProxy = gettersProxy(state, contract.getters)
  contract.metadata.validate(meta, { state, ...gProxy, contractID })
  contract.actions[action].validate(data, { state, ...gProxy, meta, contractID })
  const unencMessage = ({ action, data, meta }: GIOpActionUnencrypted)
  const message = GIMessage.createV1_0(contractID, previousHEAD,
    [
      opType,
      opType === GIMessage.OP_ACTION_UNENCRYPTED ? unencMessage : this.config.encryptFn(unencMessage)
    ],
    manifestHash
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
