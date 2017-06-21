'use strict'

import localforage from 'localforage'
import backend from '../js/backend'
import { namespace } from '../js/backend/hapi'
import * as db from './database'
import * as Events from '../../../shared/events'
import * as contracts from '../js/events'
import {EventEmitter} from 'events'
import * as invariants from './invariants'
import store from './state'
import _ from 'lodash'

let _steps = new WeakMap()
let _scope = new WeakMap()
let _cursor = new WeakMap()
let _description = new WeakMap()
let _isRevertable = new WeakMap()
class Transaction extends EventEmitter {
  constructor (description, revertable) {
    super()
    _description.set(this, description)
    _steps.set(this, [])
    _scope.set(this, new Map())
    _isRevertable.set(this, revertable || false)
  }
  addStep (step) {
    let steps = _steps.get(this)
    steps.push(step)
  }
  setInScope (name, value) {
    let scope = _scope.get(this)
    scope.set(name, value)
  }
  async run (serviceRegistry) {
    let steps = _steps.get(this)
    let scope = _scope.get(this)
    let args = {}
    for (let i = 0; i < steps.length; i++) {
      _cursor.set(this, {step: i, state: (_isRevertable.get(this) ? _.cloneDeep(store.state) : null)})
      let currentStep = steps[ i ]
      for (let argPair of Object.entries(currentStep.args)) {
        args[argPair[0]] = scope.get(argPair[1]) || serviceRegistry.get(argPair[1])
      }
      try {
        await invariants[currentStep.execute].call(this, args)
        this.emit('step complete', _cursor.get(this) + 1)
      } catch (ex) {
        if (_isRevertable.get(this)) {
          let cursor = _cursor.get(this)
          store.replaceState(cursor.state)
        }
        this.emit('error', new Error(`Step ${currentStep.description || ''} Failed \n ${ex}`))
        throw ex
      }
    }
    this.emit('complete')
  }
}

export function createInternalStateTransaction (description) {
  return new Transaction(description, true)
}

export function createExternalStateTransaction (description) {
  return new Transaction(description, true)
}
// Transaction Queue
let _transactionQueue = new WeakMap()
let _serviceRegistry = new WeakMap()
let _isRunning = new WeakMap()
class TransactionQueue {
  constructor (description) {
    _transactionQueue.set(this, [])
    _serviceRegistry.set(this, new Map())
    _isRunning.set(this, false)
    localforage.createInstance({ name: 'Transactions' })
  }

  enqueue (transaction) {
    let transactionQueue = _transactionQueue.get(this)
    transactionQueue.push(transaction)
  }

  registerService (name, service) {
    let serviceRegistry = _serviceRegistry.get(this)
    serviceRegistry.set(name, service)
  }

  async run (transaction) {
    if (transaction) {
      this.enqueue(transaction)
    }
    if (!_isRunning.get(this)) {
      _isRunning.set(this, true)
      let serviceRegistry = _serviceRegistry.get(this)
      let transactionQueue = _transactionQueue.get(this)
      let next = transactionQueue.pop()
      while (next) {
        try {
          await next.run(serviceRegistry)
        } catch (ex) {
          console.log(ex)
          // TODO Serialize and Retry
        }
        next = transactionQueue.pop()
      }
      _isRunning.set(this, false)
    }
  }
}
export let transactionQueue = new TransactionQueue()
transactionQueue.registerService('backend', backend)
transactionQueue.registerService('namespace', namespace)
transactionQueue.registerService('db', db)
transactionQueue.registerService('Events', Events)
transactionQueue.registerService('contracts', contracts)
