'use strict'

import '@sbp/okturtles.eventqueue'
import sbp from '@sbp/sbp'
import { parentPort } from 'node:worker_threads'
import { initDB } from './database.js'
import './logger.js'

export const readyQueueName = 'parentPort'

parentPort.on('message', ([port: MessagePort, ...msg: any[]]) => {
  sbp('okTurtles.eventQueue/queueEvent', readyQueueName, () => {
    (async () => {
      try {
        port?.postMessage([true, await sbp(...msg)])
      } catch (e) {
        port?.postMessage([false, e])
      }
    })()
  })
})

sbp('okTurtles.eventQueue/queueEvent', readyQueueName, async () => {
  await initDB({ skipDbPreloading: true })
  parentPort.postMessage('ready')
})
