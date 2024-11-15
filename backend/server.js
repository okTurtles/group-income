'use strict'

import Hapi from '@hapi/hapi'
import sbp from '@sbp/sbp'
import chalk from 'chalk'
import '~/shared/domains/chelonia/chelonia.js'
import { SERVER } from '~/shared/domains/chelonia/presets.js'
import initDB from './database.js'
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
import { pushServerActionhandlers } from './push.js'
// $FlowFixMe[cannot-resolve-module]
import { webcrypto } from 'node:crypto'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import type { SubMessage, UnsubMessage } from '~/shared/pubsub.js'

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
    // there's nothing to persist
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
      await sbp('okTurtles.eventQueue/queueEvent', 'update-contract-indices', async () => {
        const currentIndex = await sbp('chelonia/db/get', '_private_cheloniaState_index')
        // Add the current contract ID to the contract index. Entries in the
        // index are separated by \x00 (NUL). The index itself is used to know
        // which entries to load.
        const updatedIndex = `${currentIndex ? `${currentIndex}\x00` : ''}${contractID}`
        await sbp('chelonia/db/set', '_private_cheloniaState_index', updatedIndex)
      })
    }
  },
  'backend/server/broadcastKV': async function (contractID: string, key: string, entry: string) {
    const pubsub = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
    const pubsubMessage = createKvMessage(contractID, key, entry)
    const subscribers = pubsub.enumerateSubscribers(contractID)
    console.debug(chalk.blue.bold(`[pubsub] Broadcasting KV change on ${contractID} to key ${key}`))
    await pubsub.broadcast(pubsubMessage, { to: subscribers })
  },
  'backend/server/broadcastEntry': async function (deserializedHEAD: Object, entry: string) {
    const pubsub = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
    const pubsubMessage = createMessage(NOTIFICATION_TYPE.ENTRY, entry)
    const subscribers = pubsub.enumerateSubscribers(deserializedHEAD.contractID)
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
    await sbp('okTurtles.eventQueue/queueEvent', resourcesKey, async () => {
      const existingResources = await sbp('chelonia/db/get', resourcesKey)
      await sbp('chelonia/db/set', resourcesKey, (existingResources ? existingResources + '\x00' : '') + resourceID)
    })
  },
  'backend/server/registerBillableEntity': async function (resourceID: string) {
    // Use a queue to ensure atomic updates
    await sbp('okTurtles.eventQueue/queueEvent', '_private_billable_entities', async () => {
      const existingBillableEntities = await sbp('chelonia/db/get', '_private_billable_entities')
      await sbp('chelonia/db/set', '_private_billable_entities', (existingBillableEntities ? existingBillableEntities + '\x00' : '') + resourceID)
    })
  },
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
    webcrypto.getRandomValues(deletionTokenRaw)
    // $FlowFixMe[incompatible-call]
    const deletionToken = Buffer.from(deletionTokenRaw).toString('base64url')
    await sbp('chelonia/db/set', `_private_deletionToken_${resourceID}`, deletionToken)
    return deletionToken
  },
  'backend/server/stop': function () {
    return hapi.stop()
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
    close () {
      const socket = this
      const { server } = this

      const subscriptionId = socket.pushSubscriptionId
      console.error('@@@PUSHSUBS close evt', socket.pushSubscriptionId)

      if (!subscriptionId) return
      delete socket.pushSubscriptionId

      console.error('@@@PUSHSUBS close', socket.pushSubscriptionId, server.pushSubscriptions[subscriptionId], server.pushSubscriptions[subscriptionId].sockets.size)
      if (!server.pushSubscriptions[subscriptionId]) return

      server.pushSubscriptions[subscriptionId].sockets.delete(socket)
      delete socket.pushSubscriptionId

      if (server.pushSubscriptions[subscriptionId].sockets.size === 0) {
        console.error('@@@PUSHSUBS close sz=0', socket.pushSubscriptionId, server.pushSubscriptions[subscriptionId])
        server.pushSubscriptions[subscriptionId].subscriptions.forEach((channelID) => {
          if (!server.subscribersByChannelID[channelID]) {
            server.subscribersByChannelID[channelID] = new Set()
          }
          console.error('@@@PUSHSUBS close add', socket.pushSubscriptionId, channelID)
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
    [NOTIFICATION_TYPE.SUB] ({ channelID }: SubMessage) {
      const socket = this
      const { server } = this

      if (!socket.pushSubscriptionId) return
      if (!server.pushSubscriptions[socket.pushSubscriptionId]) {
        delete socket.pushSubscriptionId
        return
      }

      server.pushSubscriptions[socket.pushSubscriptionId].subscriptions.add(channelID)
    },
    [NOTIFICATION_TYPE.UNSUB] ({ channelID }: UnsubMessage) {
      const socket = this
      const { server } = this

      if (!socket.pushSubscriptionId) return
      if (!server.pushSubscriptions[socket.pushSubscriptionId]) {
        delete socket.pushSubscriptionId
        return
      }

      server.pushSubscriptions[socket.pushSubscriptionId].subscriptions.delete(channelID)
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
