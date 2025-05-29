'use strict'

import Hapi from '@hapi/hapi'
import sbp from '@sbp/sbp'
import chalk from 'chalk'
import { basename, join } from 'node:path'
import { Worker } from 'node:worker_threads'
import { SPMessage } from '~/shared/domains/chelonia/SPMessage.js'
import '~/shared/domains/chelonia/chelonia.js'
import '~/shared/domains/chelonia/persistent-actions.js'
import { SERVER } from '~/shared/domains/chelonia/presets.js'
import { multicodes, parseCID } from '~/shared/functions.js'
import type { SubMessage, UnsubMessage } from '~/shared/pubsub.js'
import { CREDITS_WORKER_TASK_TIME_INTERVAL, OWNER_SIZE_TOTAL_WORKER_TASK_TIME_INTERVAL } from './constants.js'
import { KEYOP_SEGMENT_LENGTH, appendToIndexFactory, initDB, lookupUltimateOwner, removeFromIndexFactory, updateSize } from './database.js'
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
import { addChannelToSubscription, deleteChannelFromSubscription, postEvent, pushServerActionhandlers, subscriptionInfoWrapper } from './push.js'

const createWorker = (path: string): {
  ready: Promise<void>,
  rpcSbp: (...args: any) => Promise<any>,
  terminate: () => Promise<number>
} => {
  let worker
  let ready: Promise<void>

  const launchWorker = () => {
    worker = new Worker(path)
    return new Promise((resolve, reject) => {
      const msgHandler = (msg) => {
        if (msg === 'ready') {
          worker.off('error', reject)
          worker.on('error', (e) => {
            console.error(e, `Running worker ${basename(path)} terminated. Attempting relaunch...`)
            worker.off('message', msgHandler)
            // This won't result in an infinite loop because of exiting and
            // because this handler is only executed after the 'ready' event
            // Relaunch can happen multiple times, so long as the worker doesn't
            // immediately fail.
            ready = launchWorker().catch(e => {
              console.error(e, `Error on worker ${basename(path)} relaunch`)
              process.exit(1)
            })
          })
          resolve()
        }
      }
      worker.on('message', msgHandler)
      worker.once('error', reject)
    })
  }
  ready = launchWorker()

  const rpcSbp = (...args: any) => {
    return ready.then(() => new Promise((resolve, reject) => {
      const mc = new MessageChannel()
      const cleanup = ((worker) => () => {
        worker.off('error', reject)
        mc.port2.onmessage = null
        mc.port2.onmessageerror = null
      })(worker)
      mc.port2.onmessage = (event) => {
        cleanup()
        const [success, result] = ((event.data: any): [boolean, any])
        if (success) return resolve(result)
        reject(result)
      }
      mc.port2.onmessageerror = () => {
        cleanup()
        reject(Error('Message error'))
      }
      worker.postMessage([mc.port1, ...args], [mc.port1])
      // If the worker itself breaks during an SBP call, we want to make sure
      // this promise immediately rejects
      worker.once('error', reject)
    }))
  }

  return {
    ready,
    rpcSbp,
    terminate: () => worker.terminate()
  }
}

if (CREDITS_WORKER_TASK_TIME_INTERVAL && OWNER_SIZE_TOTAL_WORKER_TASK_TIME_INTERVAL > CREDITS_WORKER_TASK_TIME_INTERVAL) {
  process.stderr.write('The size calculation worker must run more frequently than the credits worker for accurate billing')
  process.exit(1)
}

// Done to match the extension set by the bundler (e.g., .cjs, .mjs, .js, etc.)
const [extension] = __filename.match(/(?<!^\.)(?<=\.)([^.]+)$/) || ['.js']
const ownerSizeTotalWorker = process.env.CHELONIA_ARCHIVE_MODE || !OWNER_SIZE_TOTAL_WORKER_TASK_TIME_INTERVAL
  ? undefined
  : createWorker(join(__dirname, `ownerSizeTotalWorker.${extension}`))
const creditsWorker = process.env.CHELONIA_ARCHIVE_MODE || !CREDITS_WORKER_TASK_TIME_INTERVAL
  ? undefined
  : createWorker(join(__dirname, `creditsWorker.${extension}`))

const { CONTRACTS_VERSION, GI_VERSION } = process.env

const hapi = new Hapi.Server({
  // debug: false, // <- Hapi v16 was outputing too many unnecessary debug statements
  //               // v17 doesn't seem to do this anymore so I've re-enabled the logging
  // debug: { log: ['error'], request: ['error'] },
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

const appendToOrphanedNamesIndex = appendToIndexFactory('_private_orphaned_names_index')

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
      await sbp('chelonia.db/set', '_private_cheloniaState_' + contractID, JSON.stringify(state))
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
    // If this was a key op, add it to a keyop index. To prevent the index from
    // growing too large, the index is segmented for every KEYOP_SEGMENT_LENGTH
    // height values
    if (cheloniaState.contracts[contractID].previousKeyOp === deserializedHEAD.hash) {
      await appendToIndexFactory(`_private_keyop_idx_${contractID}_${deserializedHEAD.head.height - deserializedHEAD.head.height % KEYOP_SEGMENT_LENGTH}`)(String(deserializedHEAD.head.height))
    }
  },
  'backend/server/appendToContractIndex': appendToIndexFactory('_private_cheloniaState_index'),
  'backend/server/broadcastKV': async function (contractID: string, key: string, entry: string) {
    const pubsub = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
    const pubsubMessage = createKvMessage(contractID, key, entry)
    const subscribers = pubsub.enumerateSubscribers(contractID, key)
    console.debug(chalk.blue.bold(`[pubsub] Broadcasting KV change on ${contractID} to key ${key}`))
    await pubsub.broadcast(pubsubMessage, { to: subscribers, wsOnly: true })
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
  'backend/server/broadcastDeletion': async function (contractID: string) {
    const pubsub = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
    const pubsubMessage = createMessage(NOTIFICATION_TYPE.DELETION, contractID)
    const subscribers = pubsub.enumerateSubscribers(contractID)
    console.debug(chalk.blue.bold(`[pubsub] Broadcasting deletion of ${contractID}`))
    await pubsub.broadcast(pubsubMessage, { to: subscribers })
  },
  'backend/server/handleEntry': async function (deserializedHEAD: Object, entry: string) {
    const contractID = deserializedHEAD.contractID
    if (deserializedHEAD.head.op === SPMessage.OP_CONTRACT) {
      sbp('okTurtles.data/get', PUBSUB_INSTANCE).channels.add(contractID)
    }
    await sbp('chelonia/private/in/enqueueHandleEvent', contractID, entry)
    // Persist the Chelonia state after processing a message
    await sbp('backend/server/persistState', deserializedHEAD, entry)
    // No await on broadcast for faster responses
    sbp('backend/server/broadcastEntry', deserializedHEAD, entry).catch(e => console.error(e, 'Error broadcasting entry', contractID, deserializedHEAD.hash))
  },
  'backend/server/saveOwner': async function (ownerID: string, resourceID: string) {
    // Store the owner for the current resource
    // Use a queue to check that the owner exists, preventing the creation of
    // orphaned resources (e.g., because the owner was just deleted)
    await sbp('chelonia/queueInvocation', ownerID, async () => {
      const owner = await sbp('chelonia.db/get', ownerID)
      if (!owner) {
        throw new Error('Owner resource does not exist')
      }
      await sbp('chelonia.db/set', `_private_owner_${resourceID}`, ownerID)
      const resourcesKey = `_private_resources_${ownerID}`
      // Store the resource in the resource index key
      // This is done in a queue to handle several simultaneous requests
      // reading and writing to the same key
      await appendToIndexFactory(resourcesKey)(resourceID)
      // Done as a persistent action to return quickly. If one of the owners
      // up the chain has many resources, the operation could take a while.
      sbp('chelonia.persistentActions/enqueue', ['backend/server/addToIndirectResourcesIndex', resourceID])
    })
  },
  'backend/server/addToIndirectResourcesIndex': async function (resourceID: string) {
    const ownerID = await sbp('chelonia.db/get', `_private_owner_${resourceID}`)
    let indirectOwnerID = ownerID
    // If the owner of the owner doesn't exist, there are no indirect resources.
    while ((indirectOwnerID = await sbp('chelonia.db/get', `_private_owner_${indirectOwnerID}`))) {
      await appendToIndexFactory(`_private_indirectResources_${indirectOwnerID}`)(resourceID)
    }
  },
  'backend/server/removeFromIndirectResourcesIndex': async function (resourceID: string) {
    const ownerID = await sbp('chelonia.db/get', `_private_owner_${resourceID}`)
    const resources = await sbp('chelonia.db/get', `_private_resources_${resourceID}`)
    const indirectResources = resources ? await sbp('chelonia.db/get', `_private_indirectResources_${resourceID}`) : undefined
    const allSubresources = [
      resourceID,
      ...(resources ? resources.split('\x00') : []),
      ...(indirectResources ? indirectResources.split('\x00') : [])
    ]
    let indirectOwnerID = ownerID
    while ((indirectOwnerID = await sbp('chelonia.db/get', `_private_owner_${indirectOwnerID}`))) {
      await removeFromIndexFactory(`_private_indirectResources_${indirectOwnerID}`)(allSubresources)
    }
  },
  'backend/server/registerBillableEntity': appendToIndexFactory('_private_billable_entities'),
  'backend/server/updateSize': function (resourceID: string, size: number) {
    const sizeKey = `_private_size_${resourceID}`
    return updateSize(resourceID, sizeKey, size).then(() => {
      // Because this is relevant key for size accounting, call updateSizeSideEffects
      return ownerSizeTotalWorker?.rpcSbp('worker/updateSizeSideEffects', { resourceID, size })
    })
  },
  'backend/server/updateContractFilesTotalSize': function (resourceID: string, size: number) {
    const sizeKey = `_private_contractFilesTotalSize_${resourceID}`
    return updateSize(resourceID, sizeKey, size, true)
  },
  'backend/server/stop': function () {
    return hapi.stop()
  },
  async 'backend/deleteFile' (cid: string, ultimateOwnerID?: string | null, skipIfDeleted?: boolean | null): Promise<void> {
    const owner = await sbp('chelonia.db/get', `_private_owner_${cid}`)
    const rawManifest = await sbp('chelonia.db/get', cid)
    const size = await sbp('chelonia.db/get', `_private_size_${cid}`)
    if (owner && !ultimateOwnerID) ultimateOwnerID = await lookupUltimateOwner(owner)
    // If running in a persistent queue, already deleted contract should not
    // result in an error, because exceptions will result in the task being
    // re-attempted
    if (rawManifest === '') { if (skipIfDeleted) return; throw new BackendErrorGone() }
    if (!rawManifest) { if (skipIfDeleted) return; throw new BackendErrorNotFound() }

    try {
      const manifest = JSON.parse(rawManifest)
      if (!manifest || typeof manifest !== 'object') throw new BackendErrorBadData('manifest format is invalid')
      if (manifest.version !== '1.0.0') throw new BackendErrorBadData('unsupported manifest version')
      if (!Array.isArray(manifest.chunks) || !manifest.chunks.length) throw BackendErrorBadData('missing chunks')
      // Delete all chunks
      await Promise.all(manifest.chunks.map(([, cid]) => sbp('chelonia.db/delete', cid)))
    } catch (e) {
      console.warn(e, `Error parsing manifest for ${cid}. It's probably not a file manifest.`)
      throw new BackendErrorNotFound()
    }
    // The keys to be deleted are not read from or updated, so they can be deleted
    // without using a queue
    const resourcesKey = `_private_resources_${owner}`
    await removeFromIndexFactory(resourcesKey)(cid)
    await sbp('backend/server/removeFromIndirectResourcesIndex', cid)

    await sbp('chelonia.db/delete', `_private_owner_${cid}`)
    await sbp('chelonia.db/delete', `_private_size_${cid}`)
    await sbp('chelonia.db/delete', `_private_deletionTokenDgst_${cid}`)

    await sbp('chelonia.db/set', cid, '')
    await sbp('backend/server/updateContractFilesTotalSize', owner, -Number(size))

    if (ultimateOwnerID && size) {
      await ownerSizeTotalWorker?.rpcSbp('worker/updateSizeSideEffects', { resourceID: cid, size: -parseInt(size), ultimateOwnerID })
    }
  },
  // eslint-disable-next-line require-await
  async 'backend/deleteContract' (cid: string, ultimateOwnerID?: string | null, skipIfDeleted?: boolean | null): Promise<void> {
    let contractsPendingDeletion = sbp('okTurtles.data/get', 'contractsPendingDeletion')
    if (!contractsPendingDeletion) {
      contractsPendingDeletion = new Set()
      sbp('okTurtles.data/set', 'contractsPendingDeletion', contractsPendingDeletion)
    }
    // Avoid deadlocks due to loops
    if (contractsPendingDeletion.has(cid)) {
      return
    }
    contractsPendingDeletion.add(cid)

    return sbp('chelonia/queueInvocation', cid, async () => {
      const owner = await sbp('chelonia.db/get', `_private_owner_${cid}`)
      if (owner && !ultimateOwnerID) ultimateOwnerID = await lookupUltimateOwner(owner)
      const rawManifest = await sbp('chelonia.db/get', cid)
      const size = ultimateOwnerID && await sbp('chelonia.db/get', `_private_size_${cid}`)
      // If running in a persistent queue, already deleted contract should not
      // result in an error, because exceptions will result in the task being
      // re-attempted
      if (rawManifest === '') { if (skipIfDeleted) return; throw new BackendErrorGone() }
      if (!rawManifest) { if (skipIfDeleted) return; throw new BackendErrorNotFound() }

      // Cascade delete all resources owned by this contract, such as files
      // (attachments) and other contracts. Removing a single contract could
      // therefore result in a large number of contracts being deleted. For
      // example, in Group Income, deleting an identity contract will delete:
      //   - All groups created by that contract
      //       - This includes files like the group avatar
      //       - And also all chatrooms
      //           - And all attachments in chatrooms
      //   - All DMs created by that contract
      //       - And all attachments
      const resourcesKey = `_private_resources_${cid}`
      const resources = await sbp('chelonia.db/get', resourcesKey)
      if (resources) {
        await Promise.allSettled(resources.split('\x00').map((resourceCid) => {
          const parsed = parseCID(resourceCid)

          if (parsed.code === multicodes.SHELTER_CONTRACT_DATA) {
            return sbp('chelonia.persistentActions/enqueue', ['backend/deleteContract', resourceCid, ultimateOwnerID, true])
          } else if (parsed.code === multicodes.SHELTER_FILE_MANIFEST) {
            return sbp('chelonia.persistentActions/enqueue', ['backend/deleteFile', resourceCid, ultimateOwnerID, true])
          } else {
            console.warn({ cid, resourceCid, code: parsed.code }, 'Resource should be deleted but it is of an unknown type')
          }

          return undefined
        }))
      }
      await sbp('chelonia.db/delete', resourcesKey)

      // Next, loop through all the events, except the very first one,
      // in the contract and delete them, starting with the most recent ones.
      // If the deletion process is interrupted, parts of the contract will
      // still be able to be synced, but won't be to write to it (due to
      // latestHEADinfo not being deleted).
      const latestHEADinfo = await sbp('chelonia/db/latestHEADinfo', cid)
      if (latestHEADinfo) {
        for (let i = latestHEADinfo.height; i > 0; i--) {
          const eventKey = `_private_hidx=${cid}#${i}`
          const event = await sbp('chelonia.db/get', eventKey)
          if (event) {
            await sbp('chelonia.db/delete', JSON.parse(event).hash)
            await sbp('chelonia.db/delete', eventKey)
          }
          if (i % KEYOP_SEGMENT_LENGTH === 0) {
            await sbp('chelonia.db/delete', `_private_keyop_idx_${cid}_${i}`)
          }
        }
        await sbp('chelonia/db/deleteLatestHEADinfo', cid)
      }

      // Then, delete all KV-store values associated with this contract
      const kvIndexKey = `_private_kvIdx_${cid}`
      const kvKeys = await sbp('chelonia.db/get', kvIndexKey)
      if (kvKeys) {
        await Promise.all(kvKeys.split('\x00').map((key) => {
          return sbp('chelonia.db/delete', `_private_kv_${cid}_${key}`)
        }))
      }
      await sbp('chelonia.db/delete', kvIndexKey)
      await sbp('backend/server/removeFromIndirectResourcesIndex', cid)
      await sbp('chelonia.db/delete', `_private_indirectResources_${cid}`)

      await sbp('chelonia.db/get', `_private_cid2name_${cid}`).then((name) => {
        if (!name) return
        return Promise.all([
          sbp('chelonia.db/delete', `_private_cid2name_${cid}`),
          appendToOrphanedNamesIndex(name)
        ])
      })
      await sbp('chelonia.db/delete', `_private_rid_${cid}`)
      await sbp('chelonia.db/delete', `_private_owner_${cid}`)
      await sbp('chelonia.db/delete', `_private_size_${cid}`)
      await sbp('chelonia.db/delete', `_private_contractFilesTotalSize_${cid}`)
      await sbp('chelonia.db/delete', `_private_deletionTokenDgst_${cid}`)
      await removeFromIndexFactory(`_private_resources_${owner}`)(cid)

      // Delete the first event and its associated keys. These were not deleted
      // in the loop above that deletes events one by one.
      await sbp('chelonia.db/delete', `_private_hidx=${cid}#0`)
      await sbp('chelonia.db/delete', `_private_keyop_idx_${cid}_0`)
      await sbp('chelonia.db/set', cid, '')
      sbp('chelonia/private/removeImmediately', cid)

      if (ultimateOwnerID && size) {
        await ownerSizeTotalWorker?.rpcSbp('worker/updateSizeSideEffects', { resourceID: cid, size: -parseInt(size), ultimateOwnerID })
      }

      await sbp('chelonia.db/delete', `_private_cheloniaState_${cid}`)
      await removeFromIndexFactory('_private_cheloniaState_index')(cid)
      await removeFromIndexFactory('_private_billable_entities')(cid)
      sbp('backend/server/broadcastDeletion', cid).catch(e => {
        console.error(e, 'Error broadcasting contract deletion', cid)
      })
    }).finally(() => {
      contractsPendingDeletion.delete(cid)
    })
  }
})

if (process.env.NODE_ENV === 'development' && !process.env.CI) {
  hapi.events.on('response', (req, event, tags) => {
    const ip = req.headers['x-real-ip'] || req.info.remoteAddress
    console.debug(chalk`{grey ${ip}: ${req.method} ${req.path} --> ${req.response.statusCode}}`)
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
          const message = error?.message || `push server failed to perform [${action}] action`
          console.warn(error, `[${socket.ip}] Action '${action}' for '${REQUEST_TYPE.PUSH_ACTION}' handler failed: ${message}`)
          socket.send(createPushErrorResponse({ actionType: action, message }))
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
  await ownerSizeTotalWorker?.ready
  await creditsWorker?.ready
  await sbp('chelonia/configure', SERVER)
  sbp('chelonia.persistentActions/configure', {
    databaseKey: '_private_persistent_actions'
  })
  // Load the saved Chelonia state
  // First, get the contract index
  const savedStateIndex = await sbp('chelonia.db/get', '_private_cheloniaState_index')
  if (savedStateIndex) {
    // Now, we contract the contract state by reading each contract state
    // partition
    const recoveredState = Object.create(null)
    recoveredState.contracts = Object.create(null)
    const channels = sbp('okTurtles.data/get', PUBSUB_INSTANCE).channels
    await Promise.all(savedStateIndex.split('\x00').map(async (contractID) => {
      const cpSerialized = await sbp('chelonia.db/get', `_private_cheloniaState_${contractID}`)
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
  const savedWebPushIndex = await sbp('chelonia.db/get', '_private_webpush_index')
  if (savedWebPushIndex) {
    const { pushSubscriptions, subscribersByChannelID } = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
    await Promise.all(savedWebPushIndex.split('\x00').map(async (subscriptionId) => {
      const subscriptionSerialized = await sbp('chelonia.db/get', `_private_webpush_${subscriptionId}`)
      if (!subscriptionSerialized) {
        console.warn(`[server] missing state for subscriptionId '${subscriptionId}' - skipping setup for this subscription`)
        // TODO: implement removing the missing subscriptionId from the index
        return
      }
      const { settings, subscriptionInfo, channelIDs } = JSON.parse(subscriptionSerialized)
      pushSubscriptions[subscriptionId] = subscriptionInfoWrapper(subscriptionId, subscriptionInfo, { channelIDs, settings })
      channelIDs.forEach((channelID) => {
        if (!subscribersByChannelID[channelID]) subscribersByChannelID[channelID] = new Set()
        subscribersByChannelID[channelID].add(pushSubscriptions[subscriptionId])
      })
    }))
  }
  sbp('chelonia.persistentActions/load').catch(e => {
    console.error(e, 'Error loading persistent actions')
  })
  // https://hapi.dev/tutorials/plugins
  await hapi.register([
    { plugin: await import('./auth.js') },
    { plugin: await import('@hapi/inert') }
    // {
    //   plugin: await import('hapi-pino'),
    //   options: {
    //     instance: logger
    //   }
    // }
  ])
  await import('./routes.js')
  await hapi.start()
  console.info('Backend server running at:', hapi.info.uri)
  sbp('okTurtles.events/emit', SERVER_RUNNING, hapi)
})()

// Recurring task to send messages to push clients (for periodic notifications)
;(() => {
  const map = new WeakMap()

  setInterval(() => {
    const now = Date.now()
    const pubsub = sbp('okTurtles.data/get', PUBSUB_INSTANCE)
    // Notification text
    const notification = JSON.stringify({ type: 'recurring' })
    // Find push subscriptions that do _not_ have a WS open. This means clients
    // that are 'asleep' and that might be woken up by the push event
    Object.values(pubsub.pushSubscriptions || {})
      .filter((pushSubscription: Object) =>
        !!pushSubscription.settings.heartbeatInterval &&
        pushSubscription.sockets.size === 0
      ).forEach((pushSubscription: Object) => {
        const last = map.get(pushSubscription) ?? Number.NEGATIVE_INFINITY
        // If we've recently sent a recurring notification, skip it
        if ((now - last) < pushSubscription.settings.heartbeatInterval) return

        postEvent(pushSubscription, notification).then(() => {
          map.set(pushSubscription, now)
        }).catch((e) => {
          console.warn(e, 'Error sending recurring message to web push client', pushSubscription.id)
        })
      })
    // Repeat every 1 hour
  }, 1 * 60 * 60 * 1000)
})()
