'use strict'

import '@sbp/okturtles.eventqueue'
import sbp from '@sbp/sbp'
import { parentPort } from 'node:worker_threads'
import { initDB } from './database.js'

sbp('okTurtles.eventQueue/queueEvent', 'parentPort', async () => {
  await initDB({ skipDbPreloading: true })
  parentPort.postMessage('ready')
})

parentPort.on('message', ([port: MessagePort, ...msg: any[]]) => {
  sbp('okTurtles.eventQueue/queueEvent', 'parentPort', () => {
    (async () => {
      try {
        port?.postMessage([true, await sbp(...msg)])
      } catch (e) {
        port?.postMessage([false, e])
      }
    })()
  })
})
