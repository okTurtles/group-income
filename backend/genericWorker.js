'use strict'

import '@sbp/okturtles.eventqueue'
import sbp from '@sbp/sbp'
import { parentPort } from 'node:worker_threads'
import { initDB } from './database.js'

sbp('okTurtles.eventQueue/queueEvent', 'parentPort', () => initDB({ skipDbPreloading: true }))

parentPort.on('message', (msg) => {
  sbp('okTurtles.eventQueue/queueEvent', 'parentPort', () => sbp(...msg))
})
