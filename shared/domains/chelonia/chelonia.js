'use strict'

import '@sbp/okturtles.eventqueue'
import '@sbp/okturtles.events'
import sbp from '@sbp/sbp'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'
import { cloneDeep, delay, difference, has, intersection, merge, randomHexString, randomIntFromRange } from '~/frontend/model/contracts/shared/giLodash.js'
import { NOTIFICATION_TYPE, createClient } from '~/shared/pubsub.js'
import type { GIKey, GIOpActionUnencrypted, GIOpContract, GIOpKeyAdd, GIOpKeyDel, GIOpKeyRequest, GIOpKeyRequestSeen, GIOpKeyShare, GIOpKeyUpdate } from './GIMessage.js'
import type { Key } from './crypto.js'
import { EDWARDS25519SHA512BATCH, deserializeKey, keyId, keygen, serializeKey } from './crypto.js'
import { ChelErrorUnexpected, ChelErrorUnrecoverable } from './errors.js'
import { CHELONIA_RESET, CONTRACTS_MODIFIED, CONTRACT_REGISTERED } from './events.js'
// TODO: rename this to ChelMessage
import { GIMessage } from './GIMessage.js'
import type { Secret } from './Secret.js'
import './chelonia-utils.js'
import type { EncryptedData } from './encryptedData.js'
import { encryptedOutgoingData, isEncryptedData, maybeEncryptedIncomingData, unwrapMaybeEncryptedData } from './encryptedData.js'
import './files.js'
import './internals.js'
import { isSignedData, signedIncomingData, signedOutgoingData, signedOutgoingDataWithRawKey } from './signedData.js'
import './time-sync.js'
import { buildShelterAuthorizationHeader, checkCanBeGarbageCollected, clearObject, collectEventStream, eventsAfter, findForeignKeysByContractID, findKeyIdByName, findRevokedKeyIdsByName, findSuitableSecretKeyId, getContractIDfromKeyId, reactiveClearObject } from './utils.js'

// TODO: define ChelContractType for /defineContract

export type ChelRegParams = {
  contractName: string;
  server?: string; // TODO: implement!
  data: Object;
  signingKeyId: string;
  actionSigningKeyId: string;
  actionEncryptionKeyId: ?string;
  keys: (GIKey | EncryptedData<GIKey>)[];
  namespaceRegistration: ?string;
  hooks?: {
    prepublishContract?: (GIMessage) => void;
    postpublishContract?: (GIMessage) => void;
    preSendCheck?: (GIMessage, Object) => void;
    beforeRequest?: (GIMessage, GIMessage) => Promise<void>;
    prepublish?: (GIMessage) => Promise<void>;
    postpublish?: (GIMessage) => Promise<void>;
    onprocessed?: (GIMessage) => Promise<void>;
  };
  publishOptions?: { headers: ?Object, billableContractID: ?string, maxAttempts: number };
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
    prepublish?: (GIMessage) => Promise<void>;
    postpublish?: (GIMessage) => Promise<void>;
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
    prepublish?: (GIMessage) => Promise<void>;
    postpublish?: (GIMessage) => Promise<void>;
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
    prepublish?: (GIMessage) => Promise<void>;
    postpublish?: (GIMessage) => Promise<void>;
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
    prepublish?: (GIMessage) => Promise<void>;
    postpublish?: (GIMessage) => Promise<void>;
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
    prepublish?: (GIMessage) => Promise<void>;
    postpublish?: (GIMessage) => Promise<void>;
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
  encryptKeyRequestMetadata?: boolean;
  permissions?: '*' | string[];
  allowedActions?: '*' | string[];
  // Arbitrary data the requester can use as reference (e.g., the hash
  // of the user-initiated action that triggered this key request)
  reference?: string;
  hooks?: {
    prepublishContract?: (GIMessage) => void;
    prepublish?: (GIMessage) => Promise<void>;
    postpublish?: (GIMessage) => Promise<void>;
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
    prepublish?: (GIMessage) => Promise<void>;
    postpublish?: (GIMessage) => Promise<void>;
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
    prepublish?: (GIMessage) => Promise<void>;
    postpublish?: (GIMessage) => Promise<void>;
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
      // acceptAllMessages disables checking whether we are expecting a message
      // or not for processing
      acceptAllMessages: false,
      skipActionProcessing: false,
      skipSideEffects: false,
      // Strict processing will treat all processing errors as unrecoverable
      // This is useful, e.g., in the server, to prevent invalid messages from
      // being added to the database
      strictProcessing: false,
      // Strict ordering will throw on past events with ChelErrorAlreadyProcessed
      // Similarly, future events will not be reingested and will throw
      // with ChelErrorDBBadPreviousHEAD
      strictOrdering: false,
      connectionOptions: {
        maxRetries: Infinity, // See https://github.com/okTurtles/group-income/issues/1183
        reconnectOnTimeout: true // can be enabled since we are not doing auth via web sockets
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
    // Used in publishEvent to cancel sending events after reset (logout)
    this._instance = Object.create(null)
    this.abortController = new AbortController()
    this.state = {
      contracts: {}, // contractIDs => { type, HEAD } (contracts we've subscribed to)
      pending: [] // prevents processing unexpected data from a malicious server
    }
    this.manifestToContract = {}
    this.whitelistedActions = {}
    this.currentSyncs = Object.create(null)
    this.postSyncOperations = Object.create(null)
    this.sideEffectStacks = Object.create(null) // [contractID]: Array<*>
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
    this.ephemeralReferenceCount = Object.create(null)
    // subscriptionSet includes all the contracts in state.contracts for which
    // we can process events (contracts for which we have called /sync)
    // The reason we can't use, e.g., Object.keys(state.contracts), is that
    // when resetting the state (calling /reset, e.g., after logging out) we may
    // still receive events for old contracts that belong to the old session.
    // Those events must be ignored or discarded until the new session is set up
    // (i.e., login has finished running) because we don't necessarily have
    // all the information needed to process events in those contracts, such as
    // secret keys.
    // A concrete example is:
    //   1. user1 logs in to the group and rotates the group keys, then logs out
    //   2. user2 logs in to the group.
    //   3. If an event came over the web socket for the group, we must not
    //      process it before we've processed the OP_KEY_SHARE containing the
    //      new keys, or else we'll build an incorrect state.
    // The example above is simplified, but this is even more of an issue
    // when there is a third contract (for example, a group chatroom) using
    // those rotated keys as foreign keys.
    this.subscriptionSet = new Set()
    // pending includes contracts that are scheduled for syncing or in the
    // process of syncing for the first time. After sync completes for the
    // first time, they are removed from pending and added to subscriptionSet
    this.pending = []
  },
  'chelonia/config': function () {
    return {
      ...cloneDeep(this.config),
      reactiveSet: this.config.reactiveSet,
      reactiveDel: this.config.reactiveDel
    }
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
        await sbp('chelonia/private/loadManifest', contractName, manifests[contractName])
      }
    }
  },
  'chelonia/reset': async function (newState, postCleanupFn) {
    // Allow optional newState OR postCleanupFn
    if (typeof newState === 'function' && typeof postCleanupFn === 'undefined') {
      postCleanupFn = newState
      newState = undefined
    }
    if (this.pubsub) {
      sbp('chelonia/private/stopClockSync')
    }
    // wait for any pending sync operations to finish before saving
    Object.keys(this.postSyncOperations).forEach(cID => {
      sbp('chelonia/private/enqueuePostSyncOps', cID)
    })
    await sbp('chelonia/contract/waitPublish')
    await sbp('chelonia/contract/wait')
    // do this again to catch operations that are the result of side-effects
    // or post sync ops
    Object.keys(this.postSyncOperations).forEach(cID => {
      sbp('chelonia/private/enqueuePostSyncOps', cID)
    })
    await sbp('chelonia/contract/waitPublish')
    await sbp('chelonia/contract/wait')
    const result = await postCleanupFn?.()
    // The following are all synchronous operations
    const rootState = sbp(this.config.stateSelector)
    // Cancel all outgoing messages by replacing this._instance
    this._instance = Object.create(null)
    this.abortController.abort()
    this.abortController = new AbortController()
    // Remove all contracts, including all contracts from pending
    reactiveClearObject(rootState, this.config.reactiveDel)
    this.config.reactiveSet(rootState, 'contracts', Object.create(null))
    clearObject(this.ephemeralReferenceCount)
    this.pending.splice(0)
    clearObject(this.currentSyncs)
    clearObject(this.postSyncOperations)
    clearObject(this.sideEffectStacks)
    const removedContractIDs = Array.from(this.subscriptionSet)
    this.subscriptionSet.clear()
    sbp('chelonia/clearTransientSecretKeys')
    sbp('okTurtles.events/emit', CHELONIA_RESET)
    sbp('okTurtles.events/emit', CONTRACTS_MODIFIED, Array.from(this.subscriptionSet), { added: [], removed: removedContractIDs })
    if (this.pubsub) {
      sbp('chelonia/private/startClockSync')
    }
    if (newState) {
      Object.entries(newState).forEach(([key, value]) => {
        this.config.reactiveSet(rootState, key, value)
      })
    }
    return result
  },
  'chelonia/storeSecretKeys': function (wkeys: Secret<{key: Key | string, transient?: boolean}[]>) {
    const rootState = sbp(this.config.stateSelector)
    if (!rootState.secretKeys) this.config.reactiveSet(rootState, 'secretKeys', Object.create(null))
    let keys = wkeys.valueOf()
    if (!keys) return
    if (!Array.isArray(keys)) keys = [keys]
    keys.forEach(({ key, transient }) => {
      if (!key) return
      if (typeof key === 'string') {
        key = deserializeKey(key)
      }
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
  'chelonia/contract/isResyncing': function (contractIDOrState: string | Object) {
    if (typeof contractIDOrState === 'string') {
      const rootState = sbp(this.config.stateSelector)
      contractIDOrState = rootState[contractIDOrState]
    }
    return !!contractIDOrState?._volatile?.dirty || !!contractIDOrState?._volatile?.resyncing
  },
  'chelonia/contract/hasKeyShareBeenRespondedBy': function (contractIDOrState?: string | Object, requestedToContractID: string, reference?: string): boolean {
    if (typeof contractIDOrState === 'string') {
      const rootState = sbp(this.config.stateSelector)
      contractIDOrState = rootState[contractIDOrState]
    }
    const result = Object.values(contractIDOrState?._vm.authorizedKeys || {}).some((r) => {
      // $FlowFixMe[incompatible-use]
      return r?.meta?.keyRequest?.responded && r.meta.keyRequest.contractID === requestedToContractID && (!reference || r.meta.keyRequest.reference === reference)
    })

    return result
  },
  'chelonia/contract/waitingForKeyShareTo': function (contractIDOrState: string | Object, requestingContractID?: string, reference?: string): null | string[] {
    if (typeof contractIDOrState === 'string') {
      const rootState = sbp(this.config.stateSelector)
      contractIDOrState = rootState[contractIDOrState]
    }
    const result = contractIDOrState._volatile?.pendingKeyRequests
      ?.filter((r) => {
        return r && (!requestingContractID || r.contractID === requestingContractID) && (!reference || r.reference === reference)
      })
      ?.map(({ name }) => name)

    if (!result?.length) return null
    return result
  },
  'chelonia/contract/successfulKeySharesByContractID': function (contractIDOrState: string | Object, requestingContractID?: string) {
    if (typeof contractIDOrState === 'string') {
      const rootState = sbp(this.config.stateSelector)
      contractIDOrState = rootState[contractIDOrState]
    }
    const keyShares = Object.values(contractIDOrState._vm.keyshares || {})
    if (!keyShares?.length) return
    const result = Object.create(null)
    // $FlowFixMe[incompatible-call]
    keyShares.forEach((kS: { success: boolean, contractID: string, height: number, hash: string }) => {
      if (!kS.success) return
      if (requestingContractID && kS.contractID !== requestingContractID) return
      if (!result[kS.contractID]) result[kS.contractID] = []
      result[kS.contractID].push({ height: kS.height, hash: kS.hash })
    })
    Object.keys(result).forEach(cID => {
      result[cID].sort((a, b) => {
        return b.height - a.height
      })
    })
    return result
  },
  'chelonia/contract/hasKeysToPerformOperation': function (contractIDOrState: string | Object, operation: string) {
    if (typeof contractIDOrState === 'string') {
      const rootState = sbp(this.config.stateSelector)
      contractIDOrState = rootState[contractIDOrState]
    }
    const op = (operation !== '*') ? [operation] : operation
    return !!findSuitableSecretKeyId(contractIDOrState, op, ['sig'])
  },
  // Did sourceContractIDOrState receive an OP_KEY_SHARE to perform the given
  // operation on contractIDOrState?
  'chelonia/contract/receivedKeysToPerformOperation': function (sourceContractIDOrState: string | Object, contractIDOrState: string | Object, operation: string) {
    const rootState = sbp(this.config.stateSelector)
    if (typeof sourceContractIDOrState === 'string') {
      sourceContractIDOrState = rootState[sourceContractIDOrState]
    }
    if (typeof contractIDOrState === 'string') {
      contractIDOrState = rootState[contractIDOrState]
    }
    const op = (operation !== '*') ? [operation] : operation
    const keyId = findSuitableSecretKeyId(contractIDOrState, op, ['sig'])

    return sourceContractIDOrState?._vm?.sharedKeyIds?.some((sK) => sK.id === keyId)
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
  'chelonia/contract/foreignKeysByContractID': function (contractIDOrState: string | Object, foreignContractID: string) {
    if (typeof contractIDOrState === 'string') {
      const rootState = sbp(this.config.stateSelector)
      contractIDOrState = rootState[contractIDOrState]
    }
    return findForeignKeysByContractID(contractIDOrState, foreignContractID)
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
  'chelonia/shelterAuthorizationHeader' (contractID: string) {
    return buildShelterAuthorizationHeader.call(this, contractID)
  },
  // The purpose of the 'chelonia/crypto/*' selectors is so that they can be called
  // from contracts without including the crypto code (i.e., importing crypto.js)
  // This function takes a function as a parameter that returns a string
  // It does not a string directly to prevent accidentally logging the value,
  // which is a secret
  'chelonia/crypto/keyId': (inKey: Secret<Key | string>) => {
    return keyId(inKey.valueOf())
  },
  // TODO: allow connecting to multiple servers at once
  'chelonia/connect': function (options = {}): Object {
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
    if (this.pubsub) {
      sbp('chelonia/private/stopClockSync')
    }
    sbp('chelonia/private/startClockSync')
    this.pubsub = createClient(pubsubURL, {
      ...this.config.connectionOptions,
      handlers: {
        ...options.handlers,
        'subscription-succeeded': (event) => {
          const { channelID } = event.detail
          if (this.subscriptionSet.has(channelID)) {
            // For new subscriptions, some messages could have been lost
            // between the time the subscription was requested and it was
            // actually set up. In these cases, force sync contracts to get them
            // updated.
            sbp('chelonia/private/out/sync', channelID, { force: true }).catch(err => {
              console.warn(`[chelonia] Syncing contract ${channelID} failed: ${err.message}`)
            })
          }
        }
      },
      // Map message handlers to transparently handle encryption and signatures
      messageHandlers: {
        ...(Object.fromEntries(
          Object.entries(options.messageHandlers || {}).map(([k, v]) => {
            switch (k) {
              case NOTIFICATION_TYPE.PUB:
                return [k, (msg) => {
                  if (!msg.channelID) {
                    console.info('[chelonia] Discarding pub event without channelID')
                    return
                  }
                  if (!this.subscriptionSet.has(msg.channelID)) {
                    console.info(`[chelonia] Discarding pub event for ${msg.channelID} because it's not in the current subscriptionSet`)
                    return
                  }
                  sbp('chelonia/queueInvocation', msg.channelID, () => {
                    (v: Function)(parseEncryptedOrUnencryptedMessage.call(this, {
                      contractID: msg.channelID,
                      serializedData: msg.data
                    }))
                  }).catch(e => {
                    console.error(`[chelonia] Error processing pub event for ${msg.channelID}`, e)
                  })
                }]
              case NOTIFICATION_TYPE.KV:
                return [k, (msg) => {
                  if (!msg.channelID || !msg.key) {
                    console.info('[chelonia] Discarding kv event without channelID or key')
                    return
                  }
                  if (!this.subscriptionSet.has(msg.channelID)) {
                    console.info(`[chelonia] Discarding kv event for ${msg.channelID} because it's not in the current subscriptionSet`)
                    return
                  }
                  sbp('chelonia/queueInvocation', msg.channelID, () => {
                    (v: Function)([msg.key, parseEncryptedOrUnencryptedMessage.call(this, {
                      contractID: msg.channelID,
                      meta: msg.key,
                      serializedData: JSON.parse(Buffer.from(msg.data).toString())
                    })])
                  }).catch(e => {
                    console.error(`[chelonia] Error processing kv event for ${msg.channelID} and key ${msg.key}`, msg, e)
                  })
                }]
              case NOTIFICATION_TYPE.DELETION:
                return [k, (msg) => (v: Function)(msg.data)]
              default:
                return [k, v]
            }
          })
        )),
        [NOTIFICATION_TYPE.ENTRY] (msg) {
          // We MUST use 'chelonia/private/in/enqueueHandleEvent' to ensure handleEvent()
          // is called AFTER any currently-running calls to 'chelonia/private/out/sync'
          // to prevent gi.db from throwing "bad previousHEAD" errors.
          // Calling via SBP also makes it simple to implement 'test/backend.js'
          const { contractID } = GIMessage.deserializeHEAD(msg.data)
          sbp('chelonia/private/in/enqueueHandleEvent', contractID, msg.data)
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
  // This selector is defined primarily for ingesting web push notifications,
  // although it can be used as a general-purpose API to process events received
  // from other external sources that are not managed by Chelonia itself (i.e. sources
  // other than the Chelonia-managed websocket connection and RESTful API).
  'chelonia/handleEvent': async function (event: string) {
    const { contractID } = GIMessage.deserializeHEAD(event)
    return await sbp('chelonia/private/in/enqueueHandleEvent', contractID, event)
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
        if (sel.startsWith(contract.name + '/')) {
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
        [`${contract.manifest}/${action}/process`]: async (message: Object, state: Object) => {
          const { meta, data, contractID } = message
          // TODO: optimize so that you're creating a proxy object only when needed
          // TODO: Note: when sandboxing contracts, contracts may not have
          // access to the state directly, meaning that modifications would need
          // to be re-applied
          state = state || contract.state(contractID)
          const gProxy = gettersProxy(state, contract.getters)
          // These `await` are here to help with sandboxing in the future
          // Sandboxing may mean that contracts are executed in another context
          // (e.g., a worker), which would require asynchronous communication
          // between Chelonia and the contract.
          // Even though these are asynchronous calls, contracts should not
          // call side effects from these functions
          await contract.metadata.validate(meta, { state, ...gProxy, contractID })

          await contract.actions[action].validate(data, { state, ...gProxy, meta, message, contractID })
          // it's possible that the sideEffect stack got filled up by the call to `processMessage` from
          // a call to `publishEvent` (when an outgoing message is being sent).
          this.sideEffectStacks[contractID] = []
          await contract.actions[action].process(message, { state, ...gProxy })
        },
        // 'mutation' is an object that's similar to 'message', but not identical
        [`${contract.manifest}/${action}/sideEffect`]: async (mutation: Object, state: ?Object) => {
          if (contract.actions[action].sideEffect) {
            state = state || contract.state(mutation.contractID)
            if (!state) {
              console.warn(`[${contract.manifest}/${action}/sideEffect]: Skipping side-effect since there is no contract state for contract ${mutation.contractID}`)
              return
            }
            // TODO: Copy to simulate a sandbox boundary without direct access
            // as well as to enforce the rule that side-effects must not mutate
            // state
            const stateCopy = cloneDeep(state)
            const gProxy = gettersProxy(stateCopy, contract.getters)
            await contract.actions[action].sideEffect(mutation, { state: stateCopy, ...gProxy })
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
    // be done after all the current internal events (if any) have
    // finished processing.
    // Once all of the current internal events (in the contractID queue)
    // have completed, the operation requested is put into the public queue.
    // The reason for maintaining two different queues is to provide users
    // a way to run operations after internal operations have been processed
    // (for example, a side-effect might call queueInvocation to do work
    // after the current and future events have been processed), without the
    // work in these user-functions blocking Chelonia and prventing it from
    // processing events.
    // For example, a contract could have an action called
    // 'example/setProfilePicture'. The side-effect could look like this:
    //
    //    sideEffect ({ data, contractID }, { state }) {
    //      const profilePictureUrl = data.url
    //
    //      sbp('chelonia/queueInvocation', contractID, () => {
    //        const rootState = sbp('state/vuex/state')
    //        if  (rootState[contractID].profilePictureUrl !== profilePictureUrl)
    //          return // The profile picture changed, so we do nothing
    //
    //        // The following could take a long time. We want Chelonia
    //        // to still work and process events as normal.
    //        return fetch(profilePictureUrl).then(doSomeWorkWithTheFile)
    //      })
    //    }
    return sbp('chelonia/private/queueEvent', contractID, ['chelonia/private/noop']).then(() => sbp('chelonia/private/queueEvent', 'public:' + contractID, sbpInvocation))
  },
  'chelonia/begin': async (...invocations) => {
    for (const invocation of invocations) {
      await sbp(...invocation)
    }
  },
  // call this manually to resubscribe/unsubscribe from contracts as needed
  // if you are using a custom stateSelector and reload the state (e.g. upon login)
  'chelonia/pubsub/update': function () {
    const client = this.pubsub
    const subscribedIDs = [...client.subscriptionSet]
    const currentIDs = Array.from(this.subscriptionSet)
    const leaveSubscribed = intersection(subscribedIDs, currentIDs)
    const toUnsubscribe = difference(subscribedIDs, leaveSubscribed)
    const toSubscribe = difference(currentIDs, leaveSubscribed)
    // There is currently no need to tell other clients about our sub/unsubscriptions.
    try {
      for (const contractID of toUnsubscribe) {
        client.unsub(contractID)
      }
      for (const contractID of toSubscribe) {
        client.sub(contractID)
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
    return Promise.all(listOfIds.flatMap(cID => {
      return sbp('chelonia/queueInvocation', cID, ['chelonia/private/noop'])
    }))
  },
  // resolves when all pending *writes* for these contractID(s) finish
  'chelonia/contract/waitPublish': function (contractIDs?: string | string[]): Promise<*> {
    const listOfIds = contractIDs
      ? (typeof contractIDs === 'string' ? [contractIDs] : contractIDs)
      : Object.keys(sbp(this.config.stateSelector).contracts)
    return Promise.all(listOfIds.flatMap(cID => {
      return sbp('chelonia/private/queueEvent', `publish:${cID}`, ['chelonia/private/noop'])
    }))
  },
  // 'chelonia/contract' - selectors related to injecting remote data and monitoring contracts
  // TODO: add an optional parameter to "retain" the contract (see #828)
  // eslint-disable-next-line require-await
  'chelonia/contract/sync': async function (contractIDs: string | string[], params?: { resync?: boolean }): Promise<*> {
    // The exposed `chelonia/contract/sync` selector is meant for users of
    // Chelonia and not for internal use within Chelonia.
    // It should only be called after `/retain` where needed (for example, when
    // starting up Chelonia with a saved state)
    const listOfIds = typeof contractIDs === 'string' ? [contractIDs] : contractIDs
    // Verify that there's a valid reference count
    listOfIds.forEach((id) => {
      if (checkCanBeGarbageCollected.call(this, id)) {
        if (process.env.CI) {
          Promise.reject(new Error('[chelonia] Missing reference count for contract ' + id))
        }
        console.error('[chelonia] Missing reference count for contract ' + id)
        throw new Error('Missing reference count for contract')
      }
    })
    // Call the internal sync selector. `force` is always true as using `/sync`
    // besides internally is only needed to force sync a contract
    return sbp('chelonia/private/out/sync', listOfIds, { ...params, force: true })
  },
  'chelonia/contract/isSyncing': function (contractID: string, { firstSync = false } = {}): boolean {
    const isSyncing = !!this.currentSyncs[contractID]
    return firstSync
      ? isSyncing && this.currentSyncs[contractID].firstSync
      : isSyncing
  },
  // Because `/remove` is done asynchronously and a contract might be removed
  // much later than when the call to remove was made, an optional callback
  // can be passed to verify whether to proceed with removal. This is used as
  // part of the `/release` mechanism to prevent removing contracts that have
  // acquired new references since the call to `/remove`.
  'chelonia/contract/remove': function (contractIDs: string | string[], confirmRemovalCallback?: (contractID: string) => boolean): Promise<*> {
    const rootState = sbp(this.config.stateSelector)
    const listOfIds = typeof contractIDs === 'string' ? [contractIDs] : contractIDs
    return Promise.all(listOfIds.map(contractID => {
      if (!rootState?.contracts?.[contractID]) {
        return undefined
      }

      return sbp('chelonia/private/queueEvent', contractID, () => {
        // This allows us to double-check that the contract is meant to be
        // removed, as circumstances could have changed from the time remove
        // was called and this function is executed. For example, `/release`
        // makes a synchronous check, but processing of other events since
        // require this to be re-checked (in this case, for reference counts).
        if (confirmRemovalCallback && !confirmRemovalCallback(contractID)) {
          return
        }
        const rootState = sbp(this.config.stateSelector)
        const fkContractIDs = Array.from(new Set(Object.values(rootState[contractID]?._vm?.authorizedKeys ?? {}).filter((k) => {
          return !!(k: any).foreignKey
        }).map((k) => {
          try {
            const fkUrl = new URL((k: any).foreignKey)
            return fkUrl.pathname
          } catch {
            return undefined
          }
        }).filter(Boolean)))

        sbp('chelonia/private/removeImmediately', contractID)

        if (fkContractIDs.length) {
          // Attempt to release all contracts that are being monitored for
          // foreign keys
          sbp('chelonia/contract/release', fkContractIDs, { try: true }).catch((e) => {
            console.error('[chelonia] Error attempting to release foreign key contracts', e)
          })
        }
      })
    }))
  },
  'chelonia/contract/retain': async function (contractIDs: string | string[], params?: { ephemeral?: boolean}): Promise<*> {
    const listOfIds = typeof contractIDs === 'string' ? [contractIDs] : contractIDs
    if (listOfIds.length === 0) return Promise.resolve()
    if (!params?.ephemeral) {
      const rootState = sbp(this.config.stateSelector)
      listOfIds.forEach((id) => {
        if (!has(rootState.contracts, id)) {
          this.config.reactiveSet(rootState.contracts, id, Object.create(null))
        }
        this.config.reactiveSet(rootState.contracts[id], 'references', (rootState.contracts[id].references ?? 0) + 1)
      })
    } else {
      listOfIds.forEach((id) => {
        if (!has(this.ephemeralReferenceCount, id)) {
          this.ephemeralReferenceCount[id] = 1
        } else {
          this.ephemeralReferenceCount[id] = this.ephemeralReferenceCount[id] + 1
        }
      })
    }
    return await sbp('chelonia/private/out/sync', listOfIds)
  },
  // the `try` parameter does not affect (ephemeral or persistent) reference
  // counts, but rather removes a contract if the reference count is zero
  // and the contract isn't being monitored for foreign keys. This parameter
  // is meant mostly for internal chelonia use, so that removing or releasing
  // a contract can also remove other contracts that this first contract
  // was monitoring.
  'chelonia/contract/release': async function (contractIDs: string | string[], params?: { ephemeral?: boolean, try?: boolean }): Promise<*> {
    const listOfIds = typeof contractIDs === 'string' ? [contractIDs] : contractIDs
    const rootState = sbp(this.config.stateSelector)
    if (!params?.try) {
      if (!params?.ephemeral) {
        listOfIds.forEach((id) => {
          if (has(rootState.contracts, id) && has(rootState.contracts[id], 'references')) {
            const current = rootState.contracts[id].references
            if (current === 0) {
              console.error('[chelonia/contract/release] Invalid negative reference count for', id)
              if (process.env.CI) {
                // If running in CI, force tests to fail
                Promise.reject(new Error('Invalid negative reference count: ' + id))
              }
              throw new Error('Invalid negative reference count')
            }
            if (current <= 1) {
              this.config.reactiveDel(rootState.contracts[id], 'references')
            } else {
              this.config.reactiveSet(rootState.contracts[id], 'references', current - 1)
            }
          } else {
            console.error('[chelonia/contract/release] Invalid negative reference count for', id)
            if (process.env.CI) {
              // If running in CI, force tests to fail
              Promise.reject(new Error('Invalid negative reference count: ' + id))
            }
            throw new Error('Invalid negative reference count')
          }
        })
      } else {
        listOfIds.forEach((id) => {
          if (has(this.ephemeralReferenceCount, id)) {
            const current = this.ephemeralReferenceCount[id] ?? 0
            if (current <= 1) {
              delete this.ephemeralReferenceCount[id]
            } else {
              this.ephemeralReferenceCount[id] = current - 1
            }
          } else {
            console.error('[chelonia/contract/release] Invalid negative ephemeral reference count for', id)
            if (process.env.CI) {
              // If running in CI, force tests to fail
              Promise.reject(new Error('Invalid negative ephemeral reference count: ' + id))
            }
            throw new Error('Invalid negative ephemeral reference count')
          }
        })
      }
    }

    // This function will be called twice. The first time, it provides a list of
    // candidate contracts to remove. The second time, it confirms that the
    // contract is safe to remove
    const boundCheckCanBeGarbageCollected = checkCanBeGarbageCollected.bind(this)
    const idsToRemove = listOfIds.filter(boundCheckCanBeGarbageCollected)
    return idsToRemove.length ? await sbp('chelonia/contract/remove', idsToRemove, boundCheckCanBeGarbageCollected) : undefined
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
  'chelonia/in/processMessage': function (messageOrRawMessage: GIMessage | string, state: Object) {
    const stateCopy = cloneDeep(state)
    const message = typeof messageOrRawMessage === 'string' ? GIMessage.deserialize(messageOrRawMessage, this.transientSecretKeys, stateCopy) : messageOrRawMessage
    return sbp('chelonia/private/in/processMessage', message, stateCopy).then(() => stateCopy).catch((e) => {
      console.warn(`chelonia/in/processMessage: reverting mutation ${message.description()}: ${message.serialize()}`, e)
      return state
    })
  },
  'chelonia/out/latestHEADInfo': function (contractID: string) {
    return fetch(`${this.config.connectionURL}/latestHEADinfo/${contractID}`, {
      cache: 'no-store',
      signal: this.abortController.signal
    }).then(handleFetchResult('json'))
  },
  'chelonia/out/eventsAfter': eventsAfter,
  'chelonia/out/eventsBefore': function (contractID: string, beforeHeight: number, limit: number, options) {
    if (limit <= 0) {
      console.error('[chelonia] invalid params error: "limit" needs to be positive integer')
    }
    const offset = Math.max(0, beforeHeight - limit + 1)
    const eventsAfterLimit = Math.min(beforeHeight + 1, limit)
    return sbp('chelonia/out/eventsAfter', contractID, offset, eventsAfterLimit, undefined, options)
  },
  'chelonia/out/eventsBetween': function (contractID: string, startHash: string, endHeight: number, offset: number = 0, { stream } = { stream: true }) {
    if (offset < 0) {
      console.error('[chelonia] invalid params error: "offset" needs to be positive integer or zero')
      return
    }
    let reader: ReadableStreamReader
    const s = new ReadableStream({
      start: async (controller) => {
        const first = await fetch(`${this.config.connectionURL}/file/${startHash}`, { signal: this.abortController.signal }).then(handleFetchResult('text'))
        const deserializedHEAD = GIMessage.deserializeHEAD(first)
        if (deserializedHEAD.contractID !== contractID) {
          controller.error(new Error('chelonia/out/eventsBetween: Mismatched contract ID'))
          return
        }
        const startOffset = Math.max(0, deserializedHEAD.head.height - offset)
        const limit = endHeight - startOffset + 1
        if (limit < 1) {
          controller.close()
          return
        }
        reader = sbp('chelonia/out/eventsAfter', contractID, startOffset, limit).getReader()
      },
      async pull (controller) {
        const { done, value } = await reader.read()
        if (done) {
          controller.close()
        } else {
          controller.enqueue(value)
        }
      }
    })

    if (stream) return s
    // Workaround for <https://bugs.webkit.org/show_bug.cgi?id=215485>
    return collectEventStream(s)
  },
  'chelonia/rootState': function () { return sbp(this.config.stateSelector) },
  'chelonia/latestContractState': async function (contractID: string, options = { forceSync: false }) {
    const rootState = sbp(this.config.stateSelector)
    // return a copy of the state if we already have it, unless the only key that's in it is _volatile,
    // in which case it means we should sync the contract to get more info.
    if (!options.forceSync && rootState[contractID] && Object.keys(rootState[contractID]).some((x) => x !== '_volatile')) {
      return cloneDeep(rootState[contractID])
    }
    let state = Object.create(null)
    const eventsStream = sbp('chelonia/out/eventsAfter', contractID, 0, undefined, contractID)
    const eventsStreamReader = eventsStream.getReader()
    if (rootState[contractID]) state._volatile = rootState[contractID]._volatile
    for (;;) {
      const { value: event, done } = await eventsStreamReader.read()
      if (done) return state
      const stateCopy = cloneDeep(state)
      try {
        await sbp('chelonia/private/in/processMessage', GIMessage.deserialize(event, this.transientSecretKeys, state), state)
      } catch (e) {
        console.warn(`[chelonia] latestContractState: '${e.name}': ${e.message} processing:`, event, e.stack)
        if (e instanceof ChelErrorUnrecoverable) throw e
        state = stateCopy
      }
    }
  },
  'chelonia/contract/state': function (contractID: string, height: ?number) {
    const state = sbp(this.config.stateSelector)[contractID]
    const stateCopy = state && cloneDeep(state)
    if (stateCopy?._vm && height != null) {
      // Remove keys in the future
      Object.keys(stateCopy._vm.authorizedKeys).forEach(keyId => {
        if (stateCopy._vm.authorizedKeys[keyId]._notBeforeHeight > height) {
          delete stateCopy._vm.authorizedKeys[keyId]
        }
      })
    }
    return stateCopy
  },
  'chelonia/contract/fullState': function (contractID: string | string[]) {
    const rootState = sbp(this.config.stateSelector)
    if (Array.isArray(contractID)) {
      return Object.fromEntries(contractID.map(contractID => {
        return [
          contractID,
          {
            contractState: rootState[contractID],
            cheloniaState: rootState.contracts[contractID]
          }
        ]
      }))
    }
    return {
      contractState: rootState[contractID],
      cheloniaState: rootState.contracts[contractID]
    }
  },
  // 'chelonia/out' - selectors that send data out to the server
  'chelonia/out/registerContract': async function (params: ChelRegParams) {
    const { contractName, keys, hooks, publishOptions, signingKeyId, actionSigningKeyId, actionEncryptionKeyId } = params
    const manifestHash = this.config.contracts.manifests[contractName]
    const contractInfo = this.manifestToContract[manifestHash]
    if (!contractInfo) throw new Error(`contract not defined: ${contractName}`)
    const signingKey = this.transientSecretKeys[signingKeyId]
    if (!signingKey) throw new Error(`Signing key ${signingKeyId} is not defined`)
    const payload = ({
      type: contractName,
      keys: keys
    }: GIOpContract)
    const contractMsg = GIMessage.createV1_0({
      contractID: null,
      height: 0,
      op: [
        GIMessage.OP_CONTRACT,
        signedOutgoingDataWithRawKey(signingKey, payload)
      ],
      manifest: manifestHash
    })
    const contractID = contractMsg.hash()
    await sbp('chelonia/private/out/publishEvent', contractMsg, (params.namespaceRegistration
      ? {
          ...publishOptions,
          headers: {
            ...publishOptions?.headers,
            'shelter-namespace-registration': params.namespaceRegistration
          }
        }
      : publishOptions), hooks && {
      prepublish: hooks.prepublishContract,
      postpublish: hooks.postpublishContract
    })
    await sbp('chelonia/private/out/sync', contractID)
    const msg = await sbp(actionEncryptionKeyId
      ? 'chelonia/out/actionEncrypted'
      : 'chelonia/out/actionUnencrypted', {
      action: contractName,
      contractID,
      data: params.data,
      signingKeyId: actionSigningKeyId ?? signingKeyId,
      encryptionKeyId: actionEncryptionKeyId,
      hooks,
      publishOptions
    })
    return msg
  },
  'chelonia/out/deleteContract': async function (contractID: string | string[], credentials: { [contractID: string]: { token: ?string, billableContractID: ?string } } = {}) {
    if (!contractID) {
      throw new TypeError('A manifest CID must be provided')
    }
    if (!Array.isArray(contractID)) contractID = [contractID]
    return await Promise.allSettled(contractID.map(async (cid) => {
      const hasCredential = has(credentials, cid)
      const hasToken = has(credentials[cid], 'token') && credentials[cid].token
      const hasBillableContractID = has(credentials[cid], 'billableContractID') && credentials[cid].billableContractID
      if (!hasCredential || (!hasToken && hasToken === hasBillableContractID)) {
        throw new TypeError(`Either a token or a billable contract ID must be provided for ${cid}`)
      }

      const response = await fetch(`${this.config.connectionURL}/deleteContract/${cid}`, {
        method: 'POST',
        signal: this.abortController.signal,
        headers: new Headers([
          ['authorization',
            hasToken
              // $FlowFixMe[incompatible-type]
              ? `bearer ${(credentials[cid].token: any).valueOf()}`
              // $FlowFixMe[incompatible-type]
              // $FlowFixMe[incompatible-call]
              : buildShelterAuthorizationHeader.call(this, credentials[cid].billableContractID)]
        ])
      })
      if (!response.ok) {
        throw new Error(`Unable to delete contract ${cid}`)
      }
    }))
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

    let msg = GIMessage.createV1_0({
      contractID,
      originatingContractID,
      op: [
        GIMessage.OP_KEY_SHARE,
        params.signingKeyId
          ? signedOutgoingData(contractID, params.signingKeyId, payload, this.transientSecretKeys)
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
          // Can't add a key that exists
          return false
        }
      }

      return true
    })
    if (payload.length === 0) return
    let msg = GIMessage.createV1_0({
      contractID,
      op: [
        GIMessage.OP_KEY_ADD,
        signedOutgoingData(contractID, params.signingKeyId, payload, this.transientSecretKeys)
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
        return encryptedOutgoingData(contractID, state._vm.authorizedKeys[keyId]._private, keyId)
      } else {
        return keyId
      }
    }).filter(Boolean)
    let msg = GIMessage.createV1_0({
      contractID,
      op: [
        GIMessage.OP_KEY_DEL,
        signedOutgoingData(contractID, params.signingKeyId, (payload: any), this.transientSecretKeys)
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
        return encryptedOutgoingData(contractID, state._vm.authorizedKeys[oldKeyId]._private, key)
      } else {
        return key
      }
    })
    let msg = GIMessage.createV1_0({
      contractID,
      op: [
        GIMessage.OP_KEY_UPDATE,
        signedOutgoingData(contractID, params.signingKeyId, (payload: any), this.transientSecretKeys)
      ],
      manifest: manifestHash
    })
    if (!atomic) {
      msg = await sbp('chelonia/private/out/publishEvent', msg, publishOptions, hooks)
    }
    return msg
  },
  'chelonia/out/keyRequest': async function (params: ChelKeyRequestParams): Promise<?GIMessage> {
    const { originatingContractID, originatingContractName, contractID, contractName, hooks, publishOptions, innerSigningKeyId, encryptionKeyId, innerEncryptionKeyId, encryptKeyRequestMetadata, reference } = params
    // `encryptKeyRequestMetadata` is optional because it could be desirable
    // sometimes to allow anyone to audit OP_KEY_REQUEST and OP_KEY_SHARE
    // operations. If `encryptKeyRequestMetadata` were always true, it would
    // be harder in these situations to see interactions between two contracts.
    const manifestHash = this.config.contracts.manifests[contractName]
    const originatingManifestHash = this.config.contracts.manifests[originatingContractName]
    const contract = this.manifestToContract[manifestHash]?.contract
    const originatingContract = this.manifestToContract[originatingManifestHash]?.contract
    if (!contract) {
      throw new Error('Contract name not found')
    }
    const rootState = sbp(this.config.stateSelector)
    try {
      await sbp('chelonia/contract/retain', contractID, { ephemeral: true })
      const state = contract.state(contractID)
      const originatingState = originatingContract.state(originatingContractID)

      const havePendingKeyRequest = Object.values(originatingState._vm.authorizedKeys).findIndex((k) => {
      // $FlowFixMe
        return k._notAfterHeight == null && k.meta?.keyRequest?.contractID === contractID && state?._volatile?.pendingKeyRequests?.includes(k.name)
      }) !== -1

      // If there's a pending key request for this contract, return
      if (havePendingKeyRequest) {
        return
      }

      const keyRequestReplyKey = keygen(EDWARDS25519SHA512BATCH)
      const keyRequestReplyKeyId = keyId(keyRequestReplyKey)
      const keyRequestReplyKeyP = serializeKey(keyRequestReplyKey, false)
      const keyRequestReplyKeyS = serializeKey(keyRequestReplyKey, true)

      const signingKeyId = findSuitableSecretKeyId(originatingState, [GIMessage.OP_KEY_ADD], ['sig'])
      if (!signingKeyId) {
        throw ChelErrorUnexpected(`Unable to send key request. Originating contract is missing a key with OP_KEY_ADD permission. contractID=${contractID} originatingContractID=${originatingContractID}`)
      }
      const keyAddOp = () => sbp('chelonia/out/keyAdd', {
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
              content: encryptedOutgoingData(originatingContractID, encryptionKeyId, keyRequestReplyKeyS),
              shareable: false
            },
            keyRequest: {
              ...(reference && { reference: encryptKeyRequestMetadata ? encryptedOutgoingData(originatingContractID, encryptionKeyId, reference) : reference }),
              contractID: encryptKeyRequestMetadata ? encryptedOutgoingData(originatingContractID, encryptionKeyId, contractID) : contractID
            }
          },
          data: keyRequestReplyKeyP
        }],
        signingKeyId
      }).catch(e => {
        console.error(`[chelonia] Error sending OP_KEY_ADD for ${originatingContractID} during key request to ${contractID}`, e)
        throw e
      })
      const payload = ({
        contractID: originatingContractID,
        height: rootState.contracts[originatingContractID].height,
        replyWith: signedOutgoingData(originatingContractID, innerSigningKeyId, {
          encryptionKeyId,
          responseKey: encryptedOutgoingData(contractID, innerEncryptionKeyId, keyRequestReplyKeyS)
        }, this.transientSecretKeys),
        request: '*'
      }: GIOpKeyRequest)
      let msg = GIMessage.createV1_0({
        contractID,
        op: [
          GIMessage.OP_KEY_REQUEST,
          signedOutgoingData(contractID, params.signingKeyId,
            encryptKeyRequestMetadata
              ? (encryptedOutgoingData(contractID, innerEncryptionKeyId, payload): any)
              : payload, this.transientSecretKeys
          )
        ],
        manifest: manifestHash
      })
      msg = await sbp('chelonia/private/out/publishEvent', msg, publishOptions, {
        ...hooks,
        // We ensure that both messages are placed into the publish queue
        prepublish: (...args) => {
          return keyAddOp().then(() => hooks?.prepublish?.(...args))
        }
      })
      return msg
    } finally {
      await sbp('chelonia/contract/release', contractID, { ephemeral: true })
    }
  },
  'chelonia/out/keyRequestResponse': async function (params: ChelKeyRequestResponseParams): Promise<GIMessage> {
    const { atomic, contractID, contractName, data, hooks, publishOptions } = params
    const manifestHash = this.config.contracts.manifests[contractName]
    const contract = this.manifestToContract[manifestHash]?.contract
    if (!contract) {
      throw new Error('Contract name not found')
    }
    const payload = (data: GIOpKeyRequestSeen)
    let message = GIMessage.createV1_0({
      contractID,
      op: [
        GIMessage.OP_KEY_REQUEST_SEEN,
        signedOutgoingData(contractID, params.signingKeyId, payload, this.transientSecretKeys)
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
        signedOutgoingData(contractID, params.signingKeyId, (payload: any), this.transientSecretKeys)
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

  },
  'chelonia/out/encryptedOrUnencryptedPubMessage': function ({
    contractID,
    innerSigningKeyId,
    encryptionKeyId,
    signingKeyId,
    data
  }: {
    contractID: string,
    innerSigningKeyId: ?string,
    encryptionKeyId: ?string,
    signingKeyId: string,
    data: Object
  }) {
    const serializedData = outputEncryptedOrUnencryptedMessage.call(this, {
      contractID,
      innerSigningKeyId,
      encryptionKeyId,
      signingKeyId,
      data
    })
    this.pubsub.pub(contractID, serializedData)
  },
  // Note: This is a bare-bones function designed for precise control. In many
  // situations, the `chelonia/kv/queuedSet` selector (in chelonia-utils.js)
  // will be simpler and more appropriate to use.
  // In most situations, you want to use some queuing strategy (which this
  // selector doesn't provide) alongside writing to the KV store. Therefore, as
  // a general rule, you shouldn't be calling this selector directly unless
  // you're building a utility library or if you have very specific needs. In
  // this case, see if `chelonia/kv/queuedSet` covers your needs.
  'chelonia/kv/set': async function (contractID: string, key: string, data: Object, {
    innerSigningKeyId,
    encryptionKeyId,
    signingKeyId,
    maxAttempts,
    onconflict
  }: {
    innerSigningKeyId: ?string,
    encryptionKeyId: ?string,
    signingKeyId: string,
    maxAttempts: ?number,
    onconflict: (contractID: string, key: string, data: Object) => Promise<Object>,
  }) {
    maxAttempts = maxAttempts ?? 3
    for (;;) {
      const serializedData = outputEncryptedOrUnencryptedMessage.call(this, {
        contractID,
        innerSigningKeyId,
        encryptionKeyId,
        signingKeyId,
        data,
        meta: key
      })
      const response = await fetch(`${this.config.connectionURL}/kv/${encodeURIComponent(contractID)}/${encodeURIComponent(key)}`, {
        headers: new Headers([[
          'authorization', buildShelterAuthorizationHeader.call(this, contractID)
        ]]),
        method: 'POST',
        body: JSON.stringify(serializedData),
        signal: this.abortController.signal
      })
      if (!response.ok) {
        if (response.status === 409) {
          if (--maxAttempts <= 0) {
            throw new Error('kv/set conflict setting KV value')
          }
          await delay(randomIntFromRange(0, 1500))
          if (typeof onconflict === 'function') {
            data = await onconflict(contractID, key, data)
            if (!data) { break }
          }
          continue
        }
        throw new Error('kv/set invalid response status: ' + response.status)
      }
      break
    }
  },
  'chelonia/kv/get': async function (contractID: string, key: string) {
    const response = await fetch(`${this.config.connectionURL}/kv/${encodeURIComponent(contractID)}/${encodeURIComponent(key)}`, {
      headers: new Headers([[
        'authorization', buildShelterAuthorizationHeader.call(this, contractID)
      ]]),
      signal: this.abortController.signal
    })
    if (response.status === 404) {
      return null
    }
    if (!response.ok) {
      throw new Error('Invalid response status: ' + response.status)
    }
    const data = await response.json()
    return parseEncryptedOrUnencryptedMessage.call(this, {
      contractID,
      serializedData: data,
      meta: key
    })
  },
  'chelonia/parseEncryptedOrUnencryptedDetachedMessage': function ({ contractID, serializedData, meta }: { contractID: string, serializedData: Object, meta?: ?string }) {
    return parseEncryptedOrUnencryptedMessage.call(this, {
      contractID,
      serializedData,
      meta
    })
  }
}): string[])

function contractNameFromAction (action: string): string {
  const regexResult = ACTION_REGEX.exec(action)
  const contractName = regexResult?.[2]
  if (!contractName) throw new Error(`Poorly named action '${action}': missing contract name.`)
  return contractName
}

function outputEncryptedOrUnencryptedMessage ({
  contractID,
  innerSigningKeyId,
  encryptionKeyId,
  signingKeyId,
  data,
  meta
}: {
  contractID: string,
  innerSigningKeyId: ?string,
  encryptionKeyId: ?string,
  signingKeyId: string,
  data: Object,
  meta?: ?string
}) {
  const state = sbp(this.config.stateSelector)[contractID]
  const signedMessage = innerSigningKeyId
    ? (state._vm.authorizedKeys[innerSigningKeyId] && state._vm.authorizedKeys[innerSigningKeyId]?._notAfterHeight == null)
        ? signedOutgoingData(contractID, innerSigningKeyId, (data: any), this.transientSecretKeys)
        : signedOutgoingDataWithRawKey(this.transientSecretKeys[innerSigningKeyId], (data: any), this.transientSecretKeys)
    : data
  const payload = !encryptionKeyId
    ? signedMessage
    : encryptedOutgoingData(contractID, encryptionKeyId, signedMessage)
  const message = signedOutgoingData(contractID, signingKeyId, (payload: any), this.transientSecretKeys)
  const rootState = sbp(this.config.stateSelector)
  const height = String(rootState.contracts[contractID].height)
  const serializedData = { ...message.serialize((meta ?? '') + height), height }
  return serializedData
}

function parseEncryptedOrUnencryptedMessage ({
  contractID,
  serializedData,
  meta
}: {
  contractID: string,
  serializedData: Object,
  meta?: ?string
}) {
  if (!serializedData) {
    throw new TypeError('[chelonia] parseEncryptedOrUnencryptedMessage: serializedData is required')
  }
  const state = sbp(this.config.stateSelector)[contractID]
  const numericHeight = parseInt(serializedData.height)
  const rootState = sbp(this.config.stateSelector)
  const currentHeight = rootState.contracts[contractID].height
  if (!(numericHeight >= 0) || !(numericHeight <= currentHeight)) {
    throw new Error(`[chelonia] parseEncryptedOrUnencryptedMessage: Invalid height ${serializedData.height}; it must be between 0 and ${currentHeight}`)
  }

  // Additional data used for verification
  const aad = (meta ?? '') + serializedData.height

  const v = signedIncomingData(contractID, state, serializedData, numericHeight, aad, (message) => {
    return maybeEncryptedIncomingData(contractID, state, message, numericHeight, this.transientSecretKeys, aad, undefined)
  })

  const encryptedData = unwrapMaybeEncryptedData(v.valueOf())

  const result = {
    get contractID () {
      return contractID
    },
    get innerSigningKeyId () {
      if (!encryptedData) return
      if (isSignedData(encryptedData.data)) {
        return encryptedData.data.signingKeyId
      }
    },
    get encryptionKeyId () {
      return encryptedData?.encryptionKeyId
    },
    get signingKeyId () {
      return v.signingKeyId
    },
    get data () {
      if (!encryptedData) return
      if (isSignedData(encryptedData.data)) {
        return encryptedData.data.valueOf()
      }
      return encryptedData.data
    },
    get signingContractID () {
      return getContractIDfromKeyId(contractID, result.signingKeyId, state)
    },
    get innerSigningContractID () {
      return getContractIDfromKeyId(contractID, result.innerSigningKeyId, state)
    }
  }

  return result
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
  const unencMessage = ({ action, data, meta }: GIOpActionUnencrypted)
  const signedMessage = params.innerSigningKeyId
    ? (state._vm.authorizedKeys[params.innerSigningKeyId] && state._vm.authorizedKeys[params.innerSigningKeyId]?._notAfterHeight == null)
        ? signedOutgoingData(contractID, params.innerSigningKeyId, (unencMessage: any), this.transientSecretKeys)
        : signedOutgoingDataWithRawKey(this.transientSecretKeys[params.innerSigningKeyId], (unencMessage: any), this.transientSecretKeys)
    : unencMessage
  if (opType === GIMessage.OP_ACTION_ENCRYPTED && !params.encryptionKeyId) {
    throw new Error('OP_ACTION_ENCRYPTED requires an encryption key ID be given')
  }
  const payload = opType === GIMessage.OP_ACTION_UNENCRYPTED
    ? signedMessage
    : encryptedOutgoingData(contractID, ((params.encryptionKeyId: any): string), signedMessage)
  let message = GIMessage.createV1_0({
    contractID,
    op: [
      opType,
      signedOutgoingData(contractID, params.signingKeyId, (payload: any), this.transientSecretKeys)
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
// We pass in the state by creating a Proxy object that does it for us.
// This allows us to maintain compatibility with Vue.js and integrate
// the contract getters into the Vue-facing getters.
// For this to work, other getters need to be implemented relative to a
// 'current' getter that returns the state itself. For example:
// ```
// {
//   currentMailboxState: (state) => state, // In the contract
//   currentMailboxState: (state) => state[state.currentMailboxId], // In the app
//   lastMessage: (state, getters) => // Shared getter for both app and contract
//     getters.currentMailboxState.messages.slice(-1).pop()
// }
// ```
function gettersProxy (state: Object, getters: Object) {
  const proxyGetters = new Proxy({}, {
    get (target, prop) {
      return getters[prop](state, proxyGetters)
    }
  })
  return { getters: proxyGetters }
}
