'use strict'

import sbp from '~/shared/sbp.js'
import { merge } from '~/frontend/utils/giLodash.js'
import { GIMessage, sanityCheck } from './GIMessage.js'
import type { GIKey, GIOpContract, GIOpType, GIOpActionEncrypted, GIOpActionUnencrypted, GIOpPropSet, GIOpKeyAdd } from './GIMessage.js'

// TODO: define ChelContractType for /defineContract

export type ChelRegParams = {
  contractName: string;
  data: Object;
  keys: GIKey[];
  signingKey: Object;
  hooks?: {
    prepublishContract?: (GIMessage) => void;
    postpublishContract?: (GIMessage) => void;
    prepublish?: (GIMessage) => void;
    postpublish?: (GIMessage) => void;
  };
  publishOptions?: { maxAttempts: number };
}

export type ChelActionParams = {
  action: string;
  contractID: string;
  data: Object;
  // authorizedKeys?: GIKey[];
  hooks?: {
    prepublishContract?: (GIMessage) => void;
    postpublishContract?: (GIMessage) => void;
    prepublish?: (GIMessage) => void;
    postpublish?: (GIMessage) => void;
  };
  publishOptions?: { maxAttempts: number };
}

export const ACTION_REGEX: RegExp = /^((([\w.]+)\/([^/]+))(?:\/(?:([^/]+)\/)?)?)\w*/
// ACTION_REGEX.exec('gi.contracts/group/payment/process')
// 0 => 'gi.contracts/group/payment/process'
// 1 => 'gi.contracts/group/payment/'
// 2 => 'gi.contracts/group'
// 3 => 'gi.contracts'
// 4 => 'group'
// 5 => 'payment'

const signatureFnBuilder = (key) => {
  return (data) => {
    return {
      type: key.type,
      keyId: sbp('gi.crypto/key/id', key),
      data: sbp('gi.crypto/sign', key, data)
    }
  }
}

sbp('sbp/selectors/register', {
  // https://www.wordnik.com/words/chelonia
  // https://gitlab.okturtles.org/okturtles/group-income/-/wikis/E2E-Protocol/Framework.md#alt-names
  'chelonia/_init': function () {
    this.config = {
      decryptFn: (message) => JSON.parse(message), /* (message, state) => {        if (typeof message === 'string') {
          return JSON.parse(message)
        }
        const key = state._volatile?.[message.keyId]
        if (key) {
          return JSON.parse(sbp('gi.crypto/decrypt', sbp('gi.crypto/key/deserialize', key), message))
        }
      } */
      encryptFn: (message) => JSON.stringify(message), /* (message, state) => {        const key = state._vm?.authorizedKeys?.find((k) => k.type === 'curve25519xsalsa20poly1305' && Array.isArray(k.perm) && k.perm.includes(GIMessage.OP_ACTION_ENCRYPTED))
        if (!key) {
          return JSON.stringify(message)
        }
        return {
          keyId: key.id,
          content: sbp('gi.crypto/encrypt', sbp('gi.crypto/key/deserialize', key.data), JSON.stringify(message))
        }
      } */
      whitelisted: (action: string): boolean => !!this.whitelistedActions[action],
      latestHashSelector: 'backend/latestHash',
      publishSelector: 'backend/publishLogEntry',
      skipActionProcessing: false
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
  'chelonia/configure': function (config: ?Object) {
    merge(this.config, config || {})
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
    const { contractName, hooks, publishOptions, keys, signingKey } = params
    const contract = this.contracts[contractName]
    if (!contract) throw new Error(`contract not defined: ${contractName}`)
    const contractMsg = GIMessage.createV1_0(null, null, [
      GIMessage.OP_CONTRACT,
      ({
        type: contractName,
        keys: keys
      }: GIOpContract)
    ], signingKey ? signatureFnBuilder(signingKey) : undefined)
    hooks && hooks.prepublishContract && await hooks.prepublishContract(contractMsg)
    await sbp(this.config.publishSelector, contractMsg, publishOptions)
    hooks && hooks.postpublishContract && await hooks.postpublishContract(contractMsg)

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
  'chelonia/in/processMessage': function (message: GIMessage, state: Object, additionalKeys?: Object) {
    sanityCheck(message)
    const [opT, opV] = message.op()
    const hash = message.hash()
    const contractID = message.contractID()
    const signature = message.signature()
    const signedPayload = message.signedPayload()
    const config = this.config
    const contracts = this.contracts
    if (!state._vm) state._vm = {}
    const opFns: { [GIOpType]: (any) => void } = {
      [GIMessage.OP_CONTRACT] (v: GIOpContract) {
        const { type } = v
        if (!contracts[type]) {
          throw new Error(`chelonia: contract not recognized: '${type}'`)
        }
        state._vm.authorizedKeys = v.keys

        for (const key of opV.keys) {
          if (key.meta?.private) {
            if (key.id && key.meta.private.keyId in additionalKeys && key.meta.private.content) {
              if (!state._volatile) state._volatile = {}
              try {
                state._volatile[key.id] = sbp('gi.crypto/decrypt', additionalKeys[key.meta.private.keyId], key.meta.private.content)
              } catch (e) {
                console.error('Decryption error', e)
              }
            }
          }
        }
      },
      [GIMessage.OP_ACTION_ENCRYPTED] (v: GIOpActionEncrypted) {
        if (!config.skipActionProcessing) {
          const decrypted = message.decryptedValue((message) => config.decryptFn(message, state))
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

    // Signature verification
    // TODO: Temporary. Skip verifying default signatures
    if (signature.type !== 'default') {
      const authorizedKeys = opT === GIMessage.OP_CONTRACT ? ((opV: any): GIOpContract).keys : state._vm.authorizedKeys
      const signingKey = authorizedKeys.find((k) => k.type === signature.type && k.id === signature.keyId && Array.isArray(k.perm) && k.perm.includes(opT))

      if (!signingKey) {
        throw new Error('No matching signing key was defined')
      }

      sbp('gi.crypto/verifySignature', sbp('gi.crypto/key/deserialize', signingKey.data), signedPayload, signature.data)
    }

    if (config[`preOp_${opT}`]) {
      processOp = config[`preOp_${opT}`](message, state) !== false && processOp
    }
    if (processOp && !config.skipProcessing) {
      opFns[opT](opV)
      config.postOp && config.postOp(message, state)
      config[`postOp_${opT}`] && config[`postOp_${opT}`](message, state)
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
  const previousHEAD = await sbp(this.config.latestHashSelector, contractID)
  const meta = contract.metadata.create()
  const gProxy = gettersProxy(state, contract.getters)
  contract.metadata.validate(meta, { state, ...gProxy, contractID })
  contract.actions[action].validate(data, { state, ...gProxy, meta, contractID })
  const unencMessage = ({ action, data, meta }: GIOpActionUnencrypted)
  const message = GIMessage.createV1_0(contractID, previousHEAD, [
    opType,
    opType === GIMessage.OP_ACTION_UNENCRYPTED ? unencMessage : this.config.encryptFn(unencMessage, state)
  ]
    // TODO: add the signature function here to sign the message whether encrypted or not
  )
  hooks && hooks.prepublish && await hooks.prepublish(message)
  await sbp(this.config.publishSelector, message, publishOptions)
  hooks && hooks.postpublish && await hooks.postpublish(message)
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
