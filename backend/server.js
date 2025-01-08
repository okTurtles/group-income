'use strict'

import Hapi from '@hapi/hapi'
import sbp from '@sbp/sbp'
import chalk from 'chalk'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import '~/shared/domains/chelonia/chelonia.js'
import { SERVER } from '~/shared/domains/chelonia/presets.js'
import type { SubMessage, UnsubMessage } from '~/shared/pubsub.js'
import { appendToIndexFactory, initDB, removeFromIndexFactory } from './database.js'
import { BackendErrorBadData, BackendErrorGone, BackendErrorNotFound } from './errors.js'
import { SERVER_RUNNING } from './events.js'
import { PUBSUB_INSTANCE, SERVER_INSTANCE } from './instance-keys.js'
import {
  NOTIFICATION_TYPE,
  REQUEST_TYPE,
  createKvMessage,
  createMessage,
  createNotification,
  createPushErrorResponse,
  createServer
} from './pubsub.js'
import { addChannelToSubscription, deleteChannelFromSubscription, pushServerActionhandlers, subscriptionInfoWrapper } from './push.js'

// Node.js version 18 and lower don't have global.crypto defined
// by default
if (
  !('crypto' in global) &&
  typeof require === 'function'
) {
  const { webcrypto } = require('crypto')
  if (webcrypto) {
    Object.defineProperty(global, 'crypto', {
      'enumerable': true,
      'configurable': true,
      'get': () => webcrypto
    })
  }
}

const { CONTRACTS_VERSION, GI_VERSION } = process.env

const hapi = new Hapi.Server({
  // debug: false, // <- Hapi v16 was outputing too many unnecessary debug statements
  //               // v17 doesn't seem to do this anymore so I've re-enabled the logging
  debug: { log: ['error'], request: ['error'] },
  port: process.env.API_PORT,
  // See: https://github.com/hapijs/discuss/issues/262#issuecomment-204616831
  routes: {
    cors: {
      // TODO: figure out if we can live with '*' or if we need to restrict it
      origin: ['*']
      // origin: [
      //   process.env.API_URL,
      //   // improve support for browsersync proxy
      //   ...(process.env.NODE_ENV === 'development' && ['http://localhost:3000'])
      // ]
    }
  }
})

// See https://stackoverflow.com/questions/26213255/hapi-set-header-before-sending-response
hapi.ext({
  type: 'onPreResponse',
  method: function (request, h) {
    try {
      // Hapi Boom error responses don't have `.header()`,
      // but custom headers can be manually added using `.output.headers`.
      // See https://hapi.dev/module/boom/api/.
      if (typeof request.response.header === 'function') {
        request.response.header('X-Frame-Options', 'deny')
      } else {
        request.response.output.headers['X-Frame-Options'] = 'deny'
      }
    } catch (err) {
      console.warn(chalk.yellow('[backend] Could not set X-Frame-Options header:', err.message))
    }
    return h.continue
  }
})

sbp('okTurtles.data/set', SERVER_INSTANCE, hapi)

sbp('sbp/selectors/register', {
  'backend/server/persistState': async function (deserializedHEAD: Object, entry: string) {
    const contractID = deserializedHEAD.contractID
    const cheloniaState = sbp('chelonia/rootState')
    // If the contract has been removed or the height hasn't been updated,
    // there's nothing to persist.
    // If `!cheloniaState.contracts[contractID]`, the contract's been removed
    // and therefore we shouldn't save it.
    // If `cheloniaState.contracts[contractID].height < deserializedHEAD.head.height`,
    // it means that the message wasn't processed (we'd expect the height to
    // be `>=` than the message's height if so), and therefore we also shouldn't
    // save it.
    if (!cheloniaState.contracts[contractID] || cheloniaState.contracts[contractID].height < deserializedHEAD.head.height) {
      return
    }
    // If the current HEAD is not what we expect, don't save (the state could
    // have been updated by a later message). This ensures that we save the
    // latest state and also reduces the number of write operations
    if (cheloniaState.contracts[contractID].HEAD === deserializedHEAD.hash) {
      // Extract the parts of the state relevant to this contract
      const state = {
        contractState: cheloniaState[contractID],
        cheloniaContractInfo: cheloniaState.contracts[contractID]
      }
      // Save the state under a 'contract partition' key, so that updating a
      // contract doesn't require saving the entire state.
      // Although it's not important for the server right now, this will fail to
      // persist changes to the state for other contracts.
      // For example, when watching foreign keys, this happens: whenever a
      // foreign key for contract A is added to contract B, the private state
      // for both contract A and B is updated (when both contracts are being
      // monitored by Chelonia). However, here in this case, the updated state
      // for contract A will not be saved immediately here, and it will only be
      // saved if some other event happens later on contract A.
      // TODO: If, in the future, processing a message affects other contracts
      // in a way that is meaningful to the server, there'll need to be a way
      // to detect these changes as well. One example could be, expanding on the
      // previous scenario, if we decide that the server should enforce key
      // rotations, so that updating a foreign key 'locks' that contract until
      // the foreign key is rotated or deleted. For this to work reliably, we'd
      // need to ensure that the state for both contract B and contract A are
      // saved when the foreign key gets added to contract B.
      await sbp('chelonia/db/set', '_private_cheloniaState_' + contractID, JSON.stringify(state))
    }
    // If this is a new contract, we also need to add it to the index, which
    // is used when starting up the server to know which keys to fetch.
    // In the future, consider having a multi-level index, since the index can
    // get pretty large.
    if (contractID === deserializedHEAD.hash) {
      // We want to ensure that the index is updated atomically (i.e., if there
      // are multiple new contracts, all of them should be added), so a queue
      // is needed for the load & store operation.
      await sbp('backend/server/appendToContractIndex', contractID)
    }
  },
  'backend/server/appendToContractIndex': appendToIndexFactory('_private_cheloniaState_index'),
  'backend/server/broadcastKV': async function (contractID: string, key: string, entry: string) {
    const pubsub = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
    const pubsubMessage = createKvMessage(contractID, key, entry)
    const subscribers = pubsub.enumerateSubscribers(contractID)
    console.debug(chalk.blue.bold(`[pubsub] Broadcasting KV change on ${contractID} to key ${key}`))
    await pubsub.broadcast(pubsubMessage, { to: subscribers })
  },
  'backend/server/broadcastEntry': async function (deserializedHEAD: Object, entry: string) {
    const pubsub = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
    const contractID = deserializedHEAD.contractID
    const contractType = sbp('chelonia/rootState').contracts[contractID]?.type
    const pubsubMessage = createMessage(NOTIFICATION_TYPE.ENTRY, entry, { contractID, contractType })
    const subscribers = pubsub.enumerateSubscribers(contractID)
    console.debug(chalk.blue.bold(`[pubsub] Broadcasting ${deserializedHEAD.description()}`))
    await pubsub.broadcast(pubsubMessage, { to: subscribers })
  },
  'backend/server/handleEntry': async function (deserializedHEAD: Object, entry: string) {
    const contractID = deserializedHEAD.contractID
    if (deserializedHEAD.head.op === GIMessage.OP_CONTRACT) {
      sbp('okTurtles.data/get', PUBSUB_INSTANCE).channels.add(contractID)
    }
    await sbp('chelonia/private/in/enqueueHandleEvent', contractID, entry)
    // Persist the Chelonia state after processing a message
    await sbp('backend/server/persistState', deserializedHEAD, entry)
    await sbp('backend/server/broadcastEntry', deserializedHEAD, entry)
  },
  'backend/server/saveOwner': async function (ownerID: string, resourceID: string) {
    // Store the owner for the current resource
    await sbp('chelonia/db/set', `_private_owner_${resourceID}`, ownerID)
    const resourcesKey = `_private_resources_${ownerID}`
    // Store the resource in the resource index key
    // This is done in a queue to handle several simultaneous requests
    // reading and writing to the same key
    await appendToIndexFactory(resourcesKey)(resourceID)
  },
  'backend/server/registerBillableEntity': appendToIndexFactory('_private_billable_entities'),
  'backend/server/updateSize': async function (resourceID: string, size: number) {
    const sizeKey = `_private_size_${resourceID}`
    if (!Number.isSafeInteger(size)) {
      throw new TypeError(`Invalid given size ${size} for ${resourceID}`)
    }
    // Use a queue to ensure atomic updates
    await sbp('okTurtles.eventQueue/queueEvent', sizeKey, async () => {
      // Size is stored as a decimal value
      const existingSize = parseInt(await sbp('chelonia/db/get', sizeKey, 10) ?? '0')
      if (!(existingSize >= 0)) {
        throw new TypeError(`Invalid stored size ${existingSize} for ${resourceID}`)
      }
      await sbp('chelonia/db/set', sizeKey, (existingSize + size).toString(10))
    })
  },
  'backend/server/saveDeletionToken': async function (resourceID: string) {
    const deletionTokenRaw = new Uint8Array(18)
    // $FlowFixMe[cannot-resolve-name]
    crypto.getRandomValues(deletionTokenRaw)
    // $FlowFixMe[incompatible-call]
    const deletionToken = Buffer.from(deletionTokenRaw).toString('base64url')
    await sbp('chelonia/db/set', `_private_deletionToken_${resourceID}`, deletionToken)
    return deletionToken
  },
  'backend/server/stop': function () {
    return hapi.stop()
  },
  async 'backend/deleteFile' (cid: string): Promise<void> {
    const owner = await sbp('chelonia/db/get', `_private_owner_${cid}`)
    const rawManifest = await sbp('chelonia/db/get', cid)
    if (rawManifest === '') throw new BackendErrorGone()
    if (!rawManifest) throw new BackendErrorNotFound()

    try {
      const manifest = JSON.parse(rawManifest)
      if (!manifest || typeof manifest !== 'object') throw new BackendErrorBadData('manifest format is invalid')
      if (manifest.version !== '1.0.0') throw BackendErrorBadData('unsupported manifest version')
      if (!Array.isArray(manifest.chunks) || !manifest.chunks.length) throw BackendErrorBadData('missing chunks')
      // Delete all chunks
      await Promise.all(manifest.chunks.map(([, cid]) => sbp('chelonia/db/delete', cid)))
    } catch (e) {
      console.warn(e, `Error parsing manifest for ${cid}. It's probably not a file manifest.`)
      throw new BackendErrorNotFound()
    }
    // The keys to be deleted are not read from or updated, so they can be deleted
    // without using a queue
    const resourcesKey = `_private_resources_${owner}`
    await removeFromIndexFactory(resourcesKey)(cid)

    await sbp('chelonia/db/delete', `_private_owner_${cid}`)
    await sbp('chelonia/db/delete', `_private_size_${cid}`)
    await sbp('chelonia/db/delete', `_private_deletionToken_${cid}`)

    await sbp('chelonia/db/set', cid, '')
  },
  async 'backend/deleteContract' (cid: string): Promise<void> {
    const owner = await sbp('chelonia/db/get', `_private_owner_${cid}`)
    const rawManifest = await sbp('chelonia/db/get', cid)
    if (rawManifest === '') throw new BackendErrorGone()
    if (!rawManifest) throw new BackendErrorNotFound()

    const resourcesKey = `_private_resources_${cid}`
    const resources = await sbp('chelonia/db/get', resourcesKey)
    if (resources) {
      await Promise.allSettled(resources.split('\x00').map(async (resourceCid) => {
        // TODO: Temporary logic until we can figure out the resource type
        // directly from a CID
        const resource = Buffer.from(await sbp('chelonia/db/get', resourceCid)).toString()
        if (resource) {
          if (resource.includes('previousHEAD') && resource.includes('contractID') && resource.includes('op') && resource.includes('height')) {
            return sbp('backend/deleteContract', resourceCid)
          } else {
            return sbp('backend/deleteFile', resourceCid)
          }
        }
      }))
    }
    await sbp('chelonia/db/delete', resourcesKey)

    const latestHEADinfo = await sbp('chelonia/db/latestHEADinfo', cid)
    if (latestHEADinfo) {
      for (let i = latestHEADinfo.height; i > 0; i--) {
        const eventKey = `_private_hidx=${cid}#${i}`
        const event = await sbp('chelonia/db/get', eventKey)
        if (event) {
          await sbp('chelonia/db/delete', event)
          await sbp('chelonia/db/delete', eventKey)
        }
      }
      await sbp('chelonia/db/deleteLatestHEADinfo', cid)
    }

    const kvIndexKey = `_private_kvIdx_${cid}`
    const kvKeys = await sbp('chelonia/db/get', kvIndexKey)
    if (kvKeys) {
      await kvKeys.split('\x00').map((key) => {
        return sbp('chelonia/db/delete', key)
      })
    }

    await sbp('chelonia/db/delete', `_private_rid_${cid}`)
    await sbp('chelonia/db/delete', `_private_owner_${cid}`)
    await sbp('chelonia/db/delete', `_private_size_${cid}`)
    await sbp('chelonia/db/delete', `_private_deletionToken_${cid}`)
    await removeFromIndexFactory(kvIndexKey)(cid)
    await removeFromIndexFactory(`_private_resources_${owner}`)(cid)

    await sbp('chelonia/db/set', cid, '')

    await sbp('chelonia/db/delete', `_private_cheloniaState_${cid}`)
    await removeFromIndexFactory('_private_cheloniaState_index')(cid)
    await removeFromIndexFactory('_private_billable_entities')(cid)
  }
})

if (process.env.NODE_ENV === 'development' && !process.env.CI) {
  hapi.events.on('response', (request, event, tags) => {
    console.debug(chalk`{grey ${request.info.remoteAddress}: ${request.method.toUpperCase()} ${request.path} --> ${request.response.statusCode}}`)
  })
}

sbp('okTurtles.data/set', PUBSUB_INSTANCE, createServer(hapi.listener, {
  serverHandlers: {
    connection (socket: Object, request: Object) {
      const versionInfo = { GI_VERSION, CONTRACTS_VERSION }
      socket.send(createNotification(NOTIFICATION_TYPE.VERSION_INFO, versionInfo))
    }
  },
  socketHandlers: {
    // The `close()` handler signals the server that the WS has been closed and
    // that subsequent messages to subscribed channels should now be sent to its
    // associated web push subscription, if it exists.
    close () {
      const socket = this
      const { server } = this

      const subscriptionId = socket.pushSubscriptionId

      if (!subscriptionId) return
      if (!server.pushSubscriptions[subscriptionId]) return

      server.pushSubscriptions[subscriptionId].sockets.delete(socket)
      delete socket.pushSubscriptionId

      if (server.pushSubscriptions[subscriptionId].sockets.size === 0) {
        server.pushSubscriptions[subscriptionId].subscriptions.forEach((channelID) => {
          if (!server.subscribersByChannelID[channelID]) {
            server.subscribersByChannelID[channelID] = new Set()
          }
          server.subscribersByChannelID[channelID].add(server.pushSubscriptions[subscriptionId])
        })
      }
    }
  },
  messageHandlers: {
    [REQUEST_TYPE.PUSH_ACTION]: async function ({ data }) {
      const socket = this
      const { action, payload } = data

      if (!action) {
        socket.send(createPushErrorResponse({ message: "'action' field is required" }))
      }

      const handler = pushServerActionhandlers[action]

      if (handler) {
        try {
          await handler.call(socket, payload)
        } catch (error) {
          socket.send(createPushErrorResponse({
            actionType: action,
            message: error?.message || `push server failed to perform [${action}] action`
          }))
        }
      } else {
        socket.send(createPushErrorResponse({ message: `No handler for the '${action}' action` }))
      }
    },
    // This handler adds subscribed channels to the web push subscription
    // associated with the WS, so that when the WS is closed we can continue
    // sending messages as web push notifications.
    [NOTIFICATION_TYPE.SUB] ({ channelID }: SubMessage) {
      const socket = this
      const { server } = this

      // If the WS doesn't have an associated push subscription, we're done
      if (!socket.pushSubscriptionId) return
      // If the WS has an associated push subscription that's since been
      // removed, delete the association and return.
      if (!server.pushSubscriptions[socket.pushSubscriptionId]) {
        delete socket.pushSubscriptionId
        return
      }

      addChannelToSubscription(server, socket.pushSubscriptionId, channelID)
    },
    // This handler removes subscribed channels from the web push subscription
    // associated with the WS, so that when the WS is closed we don't send
    // messages as web push notifications.
    [NOTIFICATION_TYPE.UNSUB] ({ channelID }: UnsubMessage) {
      const socket = this
      const { server } = this

      // If the WS doesn't have an associated push subscription, we're done
      if (!socket.pushSubscriptionId) return
      // If the WS has an associated push subscription that's since been
      // removed, delete the association and return.
      if (!server.pushSubscriptions[socket.pushSubscriptionId]) {
        delete socket.pushSubscriptionId
        return
      }

      deleteChannelFromSubscription(server, socket.pushSubscriptionId, channelID)
    }
  }
}))

;(async function () {
  await initDB()
  await sbp('chelonia/configure', SERVER)
  // Load the saved Chelonia state
  // First, get the contract index
  const savedStateIndex = await sbp('chelonia/db/get', '_private_cheloniaState_index')
  if (savedStateIndex) {
    // Now, we contract the contract state by reading each contract state
    // partition
    const recoveredState = Object.create(null)
    recoveredState.contracts = Object.create(null)
    const channels = sbp('okTurtles.data/get', PUBSUB_INSTANCE).channels
    await Promise.all(savedStateIndex.split('\x00').map(async (contractID) => {
      const cpSerialized = await sbp('chelonia/db/get', `_private_cheloniaState_${contractID}`)
      if (!cpSerialized) {
        console.warn(`[server] missing state for contractID ${contractID} - skipping setup for this contract`)
        return
      }
      const cp = JSON.parse(cpSerialized)
      recoveredState[contractID] = cp.contractState
      recoveredState.contracts[contractID] = cp.cheloniaContractInfo
      // Add existing contract IDs to the list of channels
      channels.add(contractID)
    }))
    Object.assign(sbp('chelonia/rootState'), recoveredState)
  }
  // Then, load push subscriptions
  const savedWebPushIndex = await sbp('chelonia/db/get', '_private_webpush_index')
  if (savedWebPushIndex) {
    const { pushSubscriptions, subscribersByChannelID } = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
    await Promise.all(savedWebPushIndex.split('\x00').map(async (subscriptionId) => {
      const subscriptionSerialized = await sbp('chelonia/db/get', `_private_webpush_${subscriptionId}`)
      if (!subscriptionSerialized) {
        console.warn(`[server] missing state for subscriptionId ${subscriptionId} - skipping setup for this subscription`)
        return
      }
      const { subscription, channelIDs } = JSON.parse(subscriptionSerialized)
      pushSubscriptions[subscriptionId] = subscriptionInfoWrapper(subscriptionId, subscription, channelIDs)
      channelIDs.forEach((channelID) => {
        if (!subscribersByChannelID[channelID]) subscribersByChannelID[channelID] = new Set()
        subscribersByChannelID[channelID].add(pushSubscriptions[subscriptionId])
      })
    }))
  }
  // https://hapi.dev/tutorials/plugins
  await hapi.register([
    { plugin: require('./auth.js') },
    { plugin: require('@hapi/inert') }
    // {
    //   plugin: require('hapi-pino'),
    //   options: {
    //     instance: logger
    //   }
    // }
  ])
  require('./routes.js')
  await hapi.start()
  console.info('Backend server running at:', hapi.info.uri)
  sbp('okTurtles.events/emit', SERVER_RUNNING, hapi)
})()
