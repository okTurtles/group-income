'use strict'

import '@sbp/okturtles.eventqueue'
import '@sbp/okturtles.events'
import sbp from '@sbp/sbp'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'
import { cloneDeep, difference, has, intersection, merge, randomHexString } from '~/frontend/model/contracts/shared/giLodash.js'
import { b64ToStr } from '~/shared/functions.js'
import { NOTIFICATION_TYPE, createClient } from '~/shared/pubsub.js'
import type { GIKey, GIOpActionUnencrypted, GIOpContract, GIOpKeyAdd, GIOpKeyDel, GIOpKeyRequest, GIOpKeyRequestSeen, GIOpKeyShare, GIOpKeyUpdate } from './GIMessage.js'
import type { Key } from './crypto.js'
import { EDWARDS25519SHA512BATCH, deserializeKey, keyId, keygen, serializeKey } from './crypto.js'
import { ChelErrorUnexpected, ChelErrorUnrecoverable } from './errors.js'
import { CONTRACTS_MODIFIED, CONTRACT_REGISTERED } from './events.js'
// TODO: rename this to ChelMessage
import { GIMessage } from './GIMessage.js'
import { encryptedOutgoingData, isEncryptedData } from './encryptedData.js'
import type { EncryptedData } from './encryptedData.js'
import { signedOutgoingData, signedOutgoingDataWithRawKey } from './signedData.js'
import './internals.js'
import { findKeyIdByName, findRevokedKeyIdsByName, findSuitableSecretKeyId, validateKeyAddPermissions, validateKeyDelPermissions, validateKeyUpdatePermissions } from './utils.js'

// TODO: define ChelContractType for /defineContract

export type ChelRegParams = {
  contractName: string;
  server?: string; // TODO: implement!
  data: Object;
  signingKeyId: string;
  actionSigningKeyId: string;
  actionEncryptionKeyId: ?string;
  keys: (GIKey | EncryptedData<GIKey>)[];
  hooks?: {
    prepublishContract?: (GIMessage) => void;
    postpublishContract?: (GIMessage) => void;
    preSendCheck?: (GIMessage, Object) => void;
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
  signingKeyId: string;
  innerSigningKeyId: string;
  encryptionKeyId: ?string;
  hooks?: {
    prepublishContract?: (GIMessage) => void;
    prepublish?: (GIMessage) => void;
    postpublish?: (GIMessage) => void;
  };
  publishOptions?: { maxAttempts: number };
  atomic: boolean;
}

export type ChelKeyAddParams = {
  contractName: string;
  contractID: string;
  data: GIOpKeyAdd;
  signingKeyId: string;
  hooks?: {
    prepublishContract?: (GIMessage) => void;
    prepublish?: (GIMessage) => void;
    postpublish?: (GIMessage) => void;
  };
  publishOptions?: { maxAttempts: number };
  atomic: boolean;
}

export type ChelKeyDelParams = {
  contractName: string;
  contractID: string;
  data: GIOpKeyDel;
  signingKeyId: string;
  hooks?: {
    prepublishContract?: (GIMessage) => void;
    prepublish?: (GIMessage) => void;
    postpublish?: (GIMessage) => void;
  };
  publishOptions?: { maxAttempts: number };
  atomic: boolean;
}

export type ChelKeyUpdateParams = {
  contractName: string;
  contractID: string;
  data: GIOpKeyUpdate;
  signingKeyId: string;
  hooks?: {
    prepublishContract?: (GIMessage) => void;
    prepublish?: (GIMessage) => void;
    postpublish?: (GIMessage) => void;
  };
  publishOptions?: { maxAttempts: number };
  atomic: boolean;
}

export type ChelKeyShareParams = {
  originatingContractID?: string;
  originatingContractName?: string;
  contractID: string;
  contractName: string;
  data: GIOpKeyShare;
  signingKeyId?: string;
  signingKey?: Key;
  hooks?: {
    prepublishContract?: (GIMessage) => void;
    prepublish?: (GIMessage) => void;
    postpublish?: (GIMessage) => void;
  };
  publishOptions?: { maxAttempts: number };
  atomic: boolean;
}

export type ChelKeyRequestParams = {
  originatingContractID: string;
  originatingContractName: string;
  contractName: string;
  contractID: string;
  signingKeyId: string;
  innerSigningKeyId: string;
  encryptionKeyId: string;
  innerEncryptionKeyId: string;
  fullEncryption?: boolean;
  permissions?: '*' | string[];
  allowedActions?: '*' | string[];
  hooks?: {
    prepublishContract?: (GIMessage) => void;
    prepublish?: (GIMessage) => void;
    postpublish?: (GIMessage) => void;
  };
  publishOptions?: { maxAttempts: number };
  atomic: boolean;
}

export type ChelKeyRequestResponseParams = {
  contractName: string;
  contractID: string;
  data: GIOpKeyRequestSeen;
  signingKeyId: string;
  hooks?: {
    prepublishContract?: (GIMessage) => void;
    prepublish?: (GIMessage) => void;
    postpublish?: (GIMessage) => void;
  };
  publishOptions?: { maxAttempts: number };
  atomic: boolean;
}

export type ChelAtomicParams = {
  originatingContractID: string;
  originatingContractName: string;
  contractName: string;
  contractID: string;
  signingKeyId: string;
  data: [string, Object][];
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
    this.postSyncOperations = {}
    this.sideEffectStacks = {} // [contractID]: Array<*>
    this.sideEffectStack = (contractID: string): Array<*> => {
      let stack = this.sideEffectStacks[contractID]
      if (!stack) {
        this.sideEffectStacks[contractID] = stack = []
      }
      return stack
    }
    // setPostSyncOp defines operations to be run after all recent events have
    // been processed. This is useful, for example, when responding to
    // OP_KEY_REQUEST, as we want to send an OP_KEY_SHARE only to yet-unanswered
    // requests, which is information in the future (from the point of view of
    // the event handler).
    // We could directly enqueue the operations, but by using a map we avoid
    // enqueueing more operations than necessary
    // The operations defined here will be executed:
    //   (1) After a call to /sync or /syncContract; or
    //   (2) After an event has been handled, if it was received on a web socket
    this.setPostSyncOp = (contractID: string, key: string, op: Array<*>) => {
      this.postSyncOperations[contractID] = this.postSyncOperations[contractID] || Object.create(null)
      this.postSyncOperations[contractID][key] = op
    }
    const secretKeyGetter = (o, p) => {
      if (has(o, p)) return o[p]
      const rootState = sbp(this.config.stateSelector)
      if (rootState?.secretKeys && has(rootState.secretKeys, p)) {
        const key = deserializeKey(rootState.secretKeys[p])
        o[p] = key
        return key
      }
    }
    const secretKeyList = (o) => {
      const rootState = sbp(this.config.stateSelector)
      const stateKeys = Object.keys(rootState?.secretKeys || {})
      return Array.from(new Set([...Object.keys(o), ...stateKeys]))
    }
    this.transientSecretKeys = new Proxy(Object.create(null), {
      get: secretKeyGetter,
      ownKeys: secretKeyList
    })
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
    if (config.contracts) {
      Object.assign(this.config.contracts.defaults, config.contracts.defaults || {})
      const manifests = this.config.contracts.manifests
      console.debug('[chelonia] preloading manifests:', Object.keys(manifests))
      for (const contractName in manifests) {
        await sbp('chelonia/private/loadManifest', manifests[contractName])
      }
    }
  },
  'chelonia/storeSecretKeys': function (keysFn: () => {key: Key, transient?: boolean}[]) {
    const rootState = sbp(this.config.stateSelector)
    if (!rootState.secretKeys) this.config.reactiveSet(rootState, 'secretKeys', Object.create(null))
    let keys = keysFn?.()
    if (!keys) return
    if (!Array.isArray(keys) && typeof keys === 'object') keys = [keys]
    keys.forEach(({ key, transient }) => {
      if (!key) return
      const id = keyId(key)
      // Store transient keys transientSecretKeys
      if (!has(this.transientSecretKeys, id)) {
        this.transientSecretKeys[id] = key
      }
      if (transient) return
      // If the key is marked as persistent, write it to the state as well
      if (!has(rootState.secretKeys, id)) {
        this.config.reactiveSet(rootState.secretKeys, id, serializeKey(key, true))
      }
    })
  },
  'chelonia/clearTransientSecretKeys': function (ids?: string[]) {
    if (Array.isArray(ids)) {
      ids.forEach((id) => {
        delete this.transientSecretKeys[id]
      })
    } else {
      Object.keys(this.transientSecretKeys).forEach((id) => {
        delete this.transientSecretKeys[id]
      })
    }
  },
  'chelonia/haveSecretKey': function (keyId: string, persistent?: boolean) {
    if (!persistent && has(this.transientSecretKeys, keyId)) return true
    const rootState = sbp(this.config.stateSelector)
    return !!rootState?.secretKeys && has(rootState.secretKeys, keyId)
  },
  'chelonia/contract/isWaitingForKeyShare': function (contractIDOrState: string | Object) {
    if (typeof contractIDOrState === 'string') {
      const rootState = sbp(this.config.stateSelector)
      contractIDOrState = rootState[contractIDOrState]
    }
    return !!contractIDOrState._volatile?.pendingKeyRequests?.length
  },
  'chelonia/contract/canPerformOperation': function (contractIDOrState: string | Object, operation: string) {
    if (typeof contractIDOrState === 'string') {
      const rootState = sbp(this.config.stateSelector)
      contractIDOrState = rootState[contractIDOrState]
    }
    const op = (operation !== '*') ? [operation] : operation
    return !!findSuitableSecretKeyId(contractIDOrState, op, ['sig'])
  },
  'chelonia/contract/currentKeyIdByName': function (contractIDOrState: string | Object, name: string, requireSecretKey?: boolean) {
    if (typeof contractIDOrState === 'string') {
      const rootState = sbp(this.config.stateSelector)
      contractIDOrState = rootState[contractIDOrState]
    }
    const currentKeyId = findKeyIdByName(contractIDOrState, name)
    if (requireSecretKey && !sbp('chelonia/haveSecretKey', currentKeyId)) {
      return
    }
    return currentKeyId
  },
  'chelonia/contract/historicalKeyIdsByName': function (contractIDOrState: string | Object, name: string) {
    if (typeof contractIDOrState === 'string') {
      const rootState = sbp(this.config.stateSelector)
      contractIDOrState = rootState[contractIDOrState]
    }
    const currentKeyId = findKeyIdByName(contractIDOrState, name)
    const revokedKeyIds = findRevokedKeyIdsByName(contractIDOrState, name)
    return currentKeyId ? [currentKeyId, ...revokedKeyIds] : revokedKeyIds
  },
  'chelonia/contract/suitableSigningKey': function (contractIDOrState: string | Object, permissions, purposes, ringLevel, allowedActions) {
    if (typeof contractIDOrState === 'string') {
      const rootState = sbp(this.config.stateSelector)
      contractIDOrState = rootState[contractIDOrState]
    }
    const keyId = findSuitableSecretKeyId(contractIDOrState, permissions, purposes, ringLevel, allowedActions)
    return keyId
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
    const transientSecretKeys = this.transientSecretKeys
    this.pubsub = createClient(pubsubURL, {
      ...this.config.connectionOptions,
      messageHandlers: {
        [NOTIFICATION_TYPE.ENTRY] (msg) {
          // We MUST use 'chelonia/private/in/enqueueHandleEvent' to ensure handleEvent()
          // is called AFTER any currently-running calls to 'chelonia/contract/sync'
          // to prevent gi.db from throwing "bad previousHEAD" errors.
          // Calling via SBP also makes it simple to implement 'test/backend.js'
          const deserializedMessage = GIMessage.deserialize(msg.data, transientSecretKeys)
          sbp('chelonia/private/in/enqueueHandleEvent', deserializedMessage)
        },
        [NOTIFICATION_TYPE.VERSION_INFO] (msg) {
          const ourVersion = process.env.GI_VERSION
          const theirVersion = msg.data.GI_VERSION

          const ourContractsVersion = process.env.CONTRACTS_VERSION
          const theirContractsVersion = msg.data.CONTRACTS_VERSION
          if (ourVersion !== theirVersion || ourContractsVersion !== theirContractsVersion) {
            sbp('okTurtles.events/emit', NOTIFICATION_TYPE.VERSION_INFO, { ...msg.data })
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
          if (contract.actions[action].sideEffect) {
            state = state || contract.state(mutation.contractID)
            if (!state) {
              console.warn(`[${contract.manifest}/${action}/sideEffect]: Skipping side-effect since there is no contract state for contract ${mutation.contractID}`)
              return
            }
            const gProxy = gettersProxy(state, contract.getters)
            await contract.actions[action].sideEffect(mutation, { state, ...gProxy })
          }
          // since both /process and /sideEffect could call /pushSideEffect, we make sure
          // to process the side effects on the stack after calling /sideEffect.
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
  'chelonia/queueInvocation': (contractID, sbpInvocation) => {
    // We maintain two queues, contractID, used for internal events (i.e.,
    // from chelonia) and public:contractID, used for operations that need to
    // be done when no internal operations are running (e.g., calls from a
    // contract that require to be done after a sync)
    // The following waits for the internal (contractID) queue to be finished
    // and then pushes the operation requested into the public queue
    // This ensures that all internal operations have finished before these
    // other selectors are called
    return sbp('okTurtles.eventQueue/queueEvent', contractID, ['chelonia/private/noop']).then(() => sbp('okTurtles.eventQueue/queueEvent', 'public:' + contractID, sbpInvocation))
  },
  'chelonia/begin': async (...invocations) => {
    for (const invocation of invocations) {
      await sbp(...invocation)
    }
  },
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
  'chelonia/contract/sync': function (contractIDs: string | string[], params?: { force?: boolean }): Promise<*> {
    const listOfIds = typeof contractIDs === 'string' ? [contractIDs] : contractIDs
    const forcedSync = !!params?.force
    const rootState = sbp(this.config.stateSelector)
    return Promise.all(listOfIds.map(contractID => {
      if (!forcedSync && has(rootState.contracts, contractID)) {
        return undefined
      }
      // enqueue this invocation in a serial queue to ensure
      // handleEvent does not get called on contractID while it's syncing,
      // but after it's finished. This is used in tandem with
      // queuing the 'chelonia/private/in/handleEvent' selector, defined below.
      // This prevents handleEvent getting called with the wrong previousHEAD for an event.
      return sbp('okTurtles.eventQueue/queueEvent', contractID, [
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
      return sbp('okTurtles.eventQueue/queueEvent', contractID, [
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
  'chelonia/contract/disconnect': async function (contractID, contractIDToDisconnect) {
    const state = sbp(this.config.stateSelector)
    const contractState = state[contractID]

    const keyIds = Object.values(contractState._vm.authorizedKeys).filter((k) => {
      // $FlowFixMe
      return k._notAfterHeight == null && k.meta?.keyRequest?.contractID === contractIDToDisconnect
    }).map(k => (k: any).id)

    if (!keyIds.length) return

    return await sbp('chelonia/out/keyDel', {
      contractID,
      contractName: contractState._vm.type,
      data: keyIds,
      signingKeyId: findSuitableSecretKeyId(contractState, [GIMessage.OP_KEY_DEL], ['sig'])
    })
  },
  'chelonia/in/processMessage': (message: GIMessage, state: Object) => {
    const stateCopy = cloneDeep(state)
    return sbp('chelonia/private/in/processMessage', message, stateCopy).then(() => stateCopy).catch((e) => {
      console.warn(`chelonia/in/processMessage: reverting mutation ${message.description()}: ${message.serialize()}`, e)
      return state
    })
  },
  // TODO: r.body is a stream.Transform, should we use a callback to process
  //       the events one-by-one instead of converting to giant json object?
  //       however, note if we do that they would be processed in reverse...
  'chelonia/out/eventsAfter': async function (contractID: string, since: string) {
    const events = await fetch(`${this.config.connectionURL}/eventsAfter/${contractID}/${since}`)
      .then(handleFetchResult('json'))
    if (Array.isArray(events)) {
      return events.reverse().map(b64ToStr)
    }
  },
  'chelonia/out/latestHEADInfo': function (contractID: string) {
    return fetch(`${this.config.connectionURL}/latestHEADinfo/${contractID}`, {
      cache: 'no-store'
    }).then(handleFetchResult('json'))
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
  'chelonia/rootState': function () { return sbp(this.config.stateSelector) },
  'chelonia/latestContractState': async function (contractID: string, options = { forceSync: false }) {
    const rootState = sbp(this.config.stateSelector)
    // return a copy of the state if we already have it, unless the only key that's in it is _volatile,
    // in which case it means we should sync the contract to get more info.
    if (!options.forceSync && rootState[contractID] && Object.keys(rootState[contractID]).some((x) => x !== '_volatile')) {
      return cloneDeep(rootState[contractID])
    }
    const events = await sbp('chelonia/private/out/eventsAfter', contractID, contractID)
    let state = Object.create(null)
    if (rootState[contractID]) state._volatile = rootState[contractID]._volatile
    // fast-path
    try {
      for (const event of events) {
        await sbp('chelonia/private/in/processMessage', GIMessage.deserialize(event, this.transientSecretKeys, state), state)
      }
      return state
    } catch (e) {
      console.warn(`[chelonia] latestContractState(${contractID}): fast-path failed due to ${e.name}: ${e.message}`, e.stack)
      state = Object.create(null)
      if (rootState[contractID]) state._volatile = rootState[contractID]._volatile
    }
    // more error-tolerant but slower due to cloning state on each message
    for (const event of events) {
      const stateCopy = cloneDeep(state)
      try {
        await sbp('chelonia/private/in/processMessage', GIMessage.deserialize(event, this.transientSecretKeys, state), state)
      } catch (e) {
        console.warn(`[chelonia] latestContractState: '${e.name}': ${e.message} processing:`, event, e.stack)
        if (e instanceof ChelErrorUnrecoverable) throw e
        state = stateCopy
      }
    }
    return state
  },
  // 'chelonia/out' - selectors that send data out to the server
  'chelonia/out/registerContract': async function (params: ChelRegParams) {
    console.log('Register contract', { params })
    const { contractName, keys, hooks, publishOptions, signingKeyId, actionSigningKeyId, actionEncryptionKeyId } = params
    const manifestHash = this.config.contracts.manifests[contractName]
    const contractInfo = this.manifestToContract[manifestHash]
    if (!contractInfo) throw new Error(`contract not defined: ${contractName}`)
    const signingKey = this.transientSecretKeys[signingKeyId]
    const payload = ({
      type: contractName,
      keys: keys
    }: GIOpContract)
    const contractMsg = GIMessage.createV1_0({
      contractID: null,
      op: [
        GIMessage.OP_CONTRACT,
        signedOutgoingDataWithRawKey(signingKey, payload)
      ],
      manifest: manifestHash
    })
    const contractID = contractMsg.hash()
    await sbp('chelonia/private/out/publishEvent', contractMsg, publishOptions, hooks && {
      prepublish: hooks.prepublishContract,
      postpublish: hooks.postpublishContract
    })
    console.log('Register contract, sending action', {
      params,
      xx: {
        action: contractName,
        contractID,
        data: params.data,
        signingKeyId: actionSigningKeyId,
        encryptionKeyId: actionEncryptionKeyId,
        hooks,
        publishOptions
      }
    })
    await sbp('chelonia/contract/sync', contractID)
    const msg = await sbp('chelonia/out/actionEncrypted', {
      action: contractName,
      contractID,
      data: params.data,
      signingKeyId: actionSigningKeyId,
      encryptionKeyId: actionEncryptionKeyId,
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
  'chelonia/out/keyShare': async function (params: ChelKeyShareParams): Promise<GIMessage> {
    const { atomic, originatingContractName, originatingContractID, contractName, contractID, data, hooks, publishOptions } = params
    const originatingManifestHash = this.config.contracts.manifests[originatingContractName]
    const destinationManifestHash = this.config.contracts.manifests[contractName]
    const originatingContract = originatingContractID ? this.manifestToContract[originatingManifestHash]?.contract : undefined
    const destinationContract = this.manifestToContract[destinationManifestHash]?.contract

    if ((originatingContractID && !originatingContract) || !destinationContract) {
      throw new Error('Contract name not found')
    }

    const payload = (data: GIOpKeyShare)

    if (!params.signingKeyId && !params.signingKey) {
      throw new TypeError('Either signingKeyId or signingKey must be specified')
    }

    const state = destinationContract.state(contractID)
    let msg = GIMessage.createV1_0({
      contractID: contractID,
      originatingContractID,
      op: [
        GIMessage.OP_KEY_SHARE,
        params.signingKeyId
          ? signedOutgoingData(state, params.signingKeyId, payload, this.transientSecretKeys)
          // $FlowFixMe
          : signedOutgoingDataWithRawKey(params.signingKey, payload)
      ],
      manifest: destinationManifestHash
    })
    if (!atomic) {
      msg = await sbp('chelonia/private/out/publishEvent', msg, publishOptions, hooks)
    }
    return msg
  },
  'chelonia/out/keyAdd': async function (params: ChelKeyAddParams): Promise<GIMessage | void> {
    // TODO: For foreign keys, recalculate the key id
    // TODO: Make this a noop if the key already exsits with the given permissions
    const { atomic, contractID, contractName, data, hooks, publishOptions } = params
    const manifestHash = this.config.contracts.manifests[contractName]
    const contract = this.manifestToContract[manifestHash]?.contract
    if (!contract) {
      throw new Error('Contract name not found')
    }
    const state = contract.state(contractID)

    const payload = (data: GIOpKeyAdd).filter((wk) => {
      const k = (((isEncryptedData(wk) ? wk.valueOf() : wk): any): GIKey)
      if (has(state._vm.authorizedKeys, k.id)) {
        if (state._vm.authorizedKeys[k.id]._notAfterHeight == null) {
          // if (state._vm.authorizedKeys[k.id].permissions === '*')
          // TODO: Check permissions, etc.
          return false
        }
      }

      return true
    })
    if (payload.length === 0) return
    validateKeyAddPermissions(contractID, state._vm.authorizedKeys[params.signingKeyId], state, payload)
    let msg = GIMessage.createV1_0({
      contractID,
      op: [
        GIMessage.OP_KEY_ADD,
        signedOutgoingData(state, params.signingKeyId, payload, this.transientSecretKeys)
      ],
      manifest: manifestHash
    })
    if (!atomic) {
      msg = await sbp('chelonia/private/out/publishEvent', msg, publishOptions, hooks)
    }
    return msg
  },
  'chelonia/out/keyDel': async function (params: ChelKeyDelParams): Promise<GIMessage> {
    const { atomic, contractID, contractName, data, hooks, publishOptions } = params
    const manifestHash = this.config.contracts.manifests[contractName]
    const contract = this.manifestToContract[manifestHash]?.contract
    if (!contract) {
      throw new Error('Contract name not found')
    }
    const state = contract.state(contractID)
    const payload = (data: GIOpKeyDel).map((keyId) => {
      if (isEncryptedData(keyId)) return keyId
      // $FlowFixMe
      if (!has(state._vm.authorizedKeys, keyId) || state._vm.authorizedKeys[keyId]._notAfterHeight != null) return undefined
      if (state._vm.authorizedKeys[keyId]._private) {
        return encryptedOutgoingData(state, state._vm.authorizedKeys[keyId]._private, keyId)
      } else {
        return keyId
      }
    }).filter(Boolean)
    validateKeyDelPermissions(contractID, state._vm.authorizedKeys[params.signingKeyId], state, (payload: any))
    let msg = GIMessage.createV1_0({
      contractID,
      op: [
        GIMessage.OP_KEY_DEL,
        signedOutgoingData(state, params.signingKeyId, (payload: any), this.transientSecretKeys)
      ],
      manifest: manifestHash
    })
    if (!atomic) {
      msg = await sbp('chelonia/private/out/publishEvent', msg, publishOptions, hooks)
    }
    return msg
  },
  'chelonia/out/keyUpdate': async function (params: ChelKeyUpdateParams): Promise<GIMessage> {
    const { atomic, contractID, contractName, data, hooks, publishOptions } = params
    const manifestHash = this.config.contracts.manifests[contractName]
    const contract = this.manifestToContract[manifestHash]?.contract
    if (!contract) {
      throw new Error('Contract name not found')
    }
    const state = contract.state(contractID)
    const payload = (data: GIOpKeyUpdate).map((key) => {
      if (isEncryptedData(key)) return key
      // $FlowFixMe
      const { oldKeyId } = key
      if (state._vm.authorizedKeys[oldKeyId]._private) {
        return encryptedOutgoingData(state, state._vm.authorizedKeys[oldKeyId]._private, key)
      } else {
        return key
      }
    })
    validateKeyUpdatePermissions(contractID, state._vm.authorizedKeys[params.signingKeyId], state, (payload: any))
    let msg = GIMessage.createV1_0({
      contractID,
      op: [
        GIMessage.OP_KEY_UPDATE,
        signedOutgoingData(state, params.signingKeyId, (payload: any), this.transientSecretKeys)
      ],
      manifest: manifestHash
    })
    if (!atomic) {
      msg = await sbp('chelonia/private/out/publishEvent', msg, publishOptions, hooks)
    }
    return msg
  },
  'chelonia/out/keyRequest': async function (params: ChelKeyRequestParams): Promise<GIMessage> {
    const { originatingContractID, originatingContractName, contractID, contractName, hooks, publishOptions, innerSigningKeyId, encryptionKeyId, innerEncryptionKeyId, fullEncryption } = params
    const manifestHash = this.config.contracts.manifests[contractName]
    const originatingManifestHash = this.config.contracts.manifests[originatingContractName]
    const contract = this.manifestToContract[manifestHash]?.contract
    const originatingContract = this.manifestToContract[originatingManifestHash]?.contract
    if (!contract) {
      throw new Error('Contract name not found')
    }
    const rootState = sbp(this.config.stateSelector)
    const state = rootState[contractID]
    if (!rootState[contractID]) this.config.reactiveSet(rootState, contractID, state)
    const originatingState = originatingContract.state(originatingContractID)

    const keyRequestReplyKey = keygen(EDWARDS25519SHA512BATCH)
    const keyRequestReplyKeyId = keyId(keyRequestReplyKey)
    const keyRequestReplyKeyP = serializeKey(keyRequestReplyKey, false)
    const keyRequestReplyKeyS = serializeKey(keyRequestReplyKey, true)

    const signingKeyId = findSuitableSecretKeyId(originatingState, [GIMessage.OP_KEY_ADD], ['sig'])
    if (!signingKeyId) {
      throw ChelErrorUnexpected(`Unable to send key request. Originating contract is missing a key with OP_KEY_ADD permission. contractID=${contractID} originatingContractID=${originatingContractID}`)
    }
    await sbp('chelonia/out/keyAdd', {
      contractID: originatingContractID,
      contractName: originatingContractName,
      data: [{
        id: keyRequestReplyKeyId,
        name: '#krrk-' + keyRequestReplyKeyId,
        purpose: ['sig'],
        ringLevel: Number.MAX_SAFE_INTEGER,
        permissions: params.permissions === '*'
          ? '*'
          : Array.isArray(params.permissions)
            ? [...params.permissions, GIMessage.OP_KEY_SHARE]
            : [GIMessage.OP_KEY_SHARE],
        allowedActions: params.allowedActions,
        meta: {
          private: {
            content: encryptedOutgoingData(originatingState, encryptionKeyId, keyRequestReplyKeyS),
            shareable: false
          },
          keyRequest: {
            contractID: fullEncryption ? encryptedOutgoingData(originatingState, encryptionKeyId, contractID) : contractID
          }
        },
        data: keyRequestReplyKeyP
      }],
      signingKeyId
    })
    const payload = ({
      contractID: originatingContractID,
      height: rootState.contracts[originatingContractID].height,
      replyWith: signedOutgoingData(originatingState, innerSigningKeyId, {
        encryptionKeyId,
        responseKey: encryptedOutgoingData(state, innerEncryptionKeyId, keyRequestReplyKeyS)
      }, this.transientSecretKeys)
    }: GIOpKeyRequest)
    let msg = GIMessage.createV1_0({
      contractID,
      op: [
        GIMessage.OP_KEY_REQUEST,
        signedOutgoingData(state, params.signingKeyId,
          fullEncryption
            ? (encryptedOutgoingData(state, innerEncryptionKeyId, payload): any)
            : payload, this.transientSecretKeys
        )
      ],
      manifest: manifestHash
    })
    msg = await sbp('chelonia/private/out/publishEvent', msg, publishOptions, hooks)
    return msg
  },
  'chelonia/out/keyRequestResponse': async function (params: ChelKeyRequestResponseParams): Promise<GIMessage> {
    const { atomic, contractID, contractName, data, hooks, publishOptions } = params
    const manifestHash = this.config.contracts.manifests[contractName]
    const contract = this.manifestToContract[manifestHash]?.contract
    if (!contract) {
      throw new Error('Contract name not found')
    }
    const state = contract.state(contractID)
    const payload = (data: GIOpKeyRequestSeen)
    let message = GIMessage.createV1_0({
      contractID,
      op: [
        GIMessage.OP_KEY_REQUEST_SEEN,
        signedOutgoingData(state, params.signingKeyId, payload, this.transientSecretKeys)
      ],
      manifest: manifestHash
    })
    if (!atomic) {
      message = await sbp('chelonia/private/out/publishEvent', message, publishOptions, hooks)
    }
    return message
  },
  'chelonia/out/atomic': async function (params: ChelAtomicParams): Promise<GIMessage> {
    const { contractID, contractName, data, hooks, publishOptions } = params
    const manifestHash = this.config.contracts.manifests[contractName]
    const contract = this.manifestToContract[manifestHash]?.contract
    if (!contract) {
      throw new Error('Contract name not found')
    }
    const state = contract.state(contractID)
    const payload = (await Promise.all(data.map(([selector, opParams]) => {
      if (!['chelonia/out/actionEncrypted', 'chelonia/out/actionUnencrypted', 'chelonia/out/keyAdd', 'chelonia/out/keyDel', 'chelonia/out/keyUpdate', 'chelonia/out/keyRequestResponse', 'chelonia/out/keyShare'].includes(selector)) {
        throw new Error('Selector not allowed in OP_ATOMIC: ' + selector)
      }
      return sbp(selector, { ...opParams, ...params, data: opParams.data, atomic: true })
    }))).flat().filter(Boolean).map((msg) => {
      return [msg.opType(), msg.opValue()]
    })
    let msg = GIMessage.createV1_0({
      contractID,
      op: [
        GIMessage.OP_ATOMIC,
        signedOutgoingData(state, params.signingKeyId, (payload: any), this.transientSecretKeys)
      ],
      manifest: manifestHash
    })
    msg = await sbp('chelonia/private/out/publishEvent', msg, publishOptions, hooks)
    return msg
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
  const contractName = regexResult?.[2]
  if (!contractName) throw new Error(`Poorly named action '${action}': missing contract name.`)
  return contractName
}

async function outEncryptedOrUnencryptedAction (
  opType: 'ae' | 'au',
  params: ChelActionParams
) {
  const { atomic, action, contractID, data, hooks, publishOptions } = params
  const contractName = contractNameFromAction(action)
  const manifestHash = this.config.contracts.manifests[contractName]
  const { contract } = this.manifestToContract[manifestHash]
  const state = contract.state(contractID)
  const meta = await contract.metadata.create()
  const gProxy = gettersProxy(state, contract.getters)
  contract.metadata.validate(meta, { state, ...gProxy, contractID })
  contract.actions[action].validate(data, { state, ...gProxy, meta, contractID })
  const unencMessage = ({ action, data, meta }: GIOpActionUnencrypted)
  const signedMessage = params.innerSigningKeyId
    ? state._vm.authorizedKeys[params.innerSigningKeyId]
      ? signedOutgoingData(state, params.innerSigningKeyId, (unencMessage: any), this.transientSecretKeys)
      : signedOutgoingDataWithRawKey(this.transientSecretKeys[params.innerSigningKeyId], (unencMessage: any), this.transientSecretKeys)
    : unencMessage
  if (opType === GIMessage.OP_ACTION_ENCRYPTED && !params.encryptionKeyId) {
    throw new Error('OP_ACTION_ENCRYPTED requires an encryption key ID be given')
  }
  const payload = opType === GIMessage.OP_ACTION_UNENCRYPTED
    ? signedMessage
    : encryptedOutgoingData(state, ((params.encryptionKeyId: any): string), signedMessage)
  let message = GIMessage.createV1_0({
    contractID,
    op: [
      opType,
      signedOutgoingData(state, params.signingKeyId, (payload: any), this.transientSecretKeys)
    ],
    manifest: manifestHash
  })
  if (!atomic) {
    message = await sbp('chelonia/private/out/publishEvent', message, publishOptions, hooks)
  }
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
