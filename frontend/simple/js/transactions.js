'use strict'

import localforage from 'localforage'
import * as Events from '../../../shared/events'
import sbp from '../../../shared/sbp'

let _steps = new WeakMap()
let _scope = new WeakMap()
let _cursor = new WeakMap()
let _description = new WeakMap()
let _isRecoverable = new WeakMap()
let _wait = new WeakMap()
// Why would need this?  to make our retries grow in a common sense ways
function fibSequence (num) {
  let output = 0
  let sequence = [ 0, 1 ]
  for (var i = 0; i < num; i++) {
    sequence.push(sequence[ 0 ] + sequence[ 1 ])
    sequence.splice(0, 1)
    output = sequence[ 1 ]
  }
  return output
}

let transactionDB = localforage.createInstance({ name: 'Transactions', storeName: 'Transactions' })
export class Transaction {
  constructor (description, recoverable) {
    _description.set(this, description)
    _steps.set(this, [])
    _scope.set(this, {})
    _isRecoverable.set(this, !!recoverable)
    _cursor.set(this, 0)
    let res
    let rej
    let promise = new Promise((resolve, reject) => (res = resolve) && (rej = reject))
    _wait.set(this, {promise, resolve: res, reject: rej})
  }
  get isRecoverable () {
    return _isRecoverable.get(this)
  }
  wait () {
    let wait = _wait.get(this)
    return wait.promise
  }
  addStep (step) {
    let steps = _steps.get(this)
    steps.push(step)
  }
  // This function creates variables in the transaction's scope to be referenced by steps
  setInScope (name, value) {
    let scope = _scope.get(this)
    scope[name] = value
    _scope.set(this, scope)
  }
  async run (serviceRegistry) {
    let steps = _steps.get(this)
    let scope = _scope.get(this)
    let cursor = _cursor.get(this)
    let wait = _wait.get(this)
    for (let i = cursor; i < steps.length; i++) {
      let args = {}
      // Keep track of a cursor of what step in the transaction we are operating
      _cursor.set(this, i)
      let currentStep = steps[ i ]
      // Build arguments from services and scoped data
      for (let argPair of Object.entries(currentStep.args)) {
        args[argPair[0]] = scope[argPair[1]]
      }
      args.setInScope = this.setInScope.bind(this)
      // Attempt to run step
      try {
        await sbp(currentStep.execute, args)
      } catch (ex) {
        wait.reject(new Error(`Step - ${currentStep.description || ''} failed with error, \n ${ex}`))
        throw ex
      }
    }
    wait.resolve()
  }
  toJSON () {
    return {
      steps: _steps.get(this),
      scope: _scope.get(this),
      cursor: _cursor.get(this),
      isRecoverable: _isRecoverable.get(this),
      description: _description.get(this)
    }
  }
  static isTransaction (obj) {
    if (typeof obj !== 'object') return false
    if (!Array.isArray(obj.steps)) return false
    if (typeof obj.scope !== 'object') return false
    if (!Number.isInteger(obj.cursor)) return false
    if (typeof obj.isRecoverable !== 'boolean') return false
    if (typeof obj.description !== 'string') return false
    return true
  }
  static fromJSON (json) {
    if (!Transaction.isTransaction(json)) {
      throw new TypeError('Invalid Transaction')
    }
    for (let key of Object.keys(json.scope)) {
      if (Events.HashableEntry.isHashableEntry(json.scope[key])) {
        json.scope[key] = Events.HashableEntry.fromJSON(json.scope[key])
      }
    }
    let transaction = new Transaction(json.description, json.isRecoverable)
    _scope.set(transaction, json.scope)
    _cursor.set(transaction, json.cursor)
    _steps.set(transaction, json.steps)
    return transaction
  }
}

export function createInternalStateTransaction (description) {
  return new Transaction(description, false)
}

export function createExternalStateTransaction (description) {
  return new Transaction(description, true)
}
// Transaction Queue
let _transactionQueue = new WeakMap()
let _serviceRegistry = new WeakMap()
let _isRunning = new WeakMap()
let _transactionID = new WeakMap()
let _isLoaded = new WeakMap()
let _failures = new WeakMap()
class TransactionQueue {
  constructor (description) {
    _transactionQueue.set(this, [])
    _serviceRegistry.set(this, new Map())
    _isRunning.set(this, false)
    _transactionID.set(this, 0)
    _isLoaded.set(this, false)
    _failures.set(this, [])
  }
  async load () {
    if (_isLoaded.get(this)) { return }
    try {
      let transactionID = await transactionDB.getItem('nextID')
      if (!transactionID) {
        transactionID = 0
        await transactionDB.setItem('nextID', transactionID)
      } else {
        await _transactionID.set(this, transactionID)
      }
      let failures = await transactionDB.getItem('failures') || []
      _failures.set(this, failures)
      for (let failed of failures) {
        let json = await transactionDB.getItem(`${failed.id}`)
        let transaction = Transaction.fromJSON(json)
        _transactionID.set(transaction, failed.id)
        this.enqueue(transaction)
      }
      this.run()
    } catch (ex) {
      console.log(ex)
    }
  }

  enqueue (transaction) {
    let transactionQueue = _transactionQueue.get(this)
    transactionQueue.push(transaction)
  }

  async run (transaction) {
    if (transaction) {
      this.enqueue(transaction)
    }
    if (!_isRunning.get(this)) {
      _isRunning.set(this, true)
      let transactionQueue = _transactionQueue.get(this)
      let next = transactionQueue.pop()
      while (next) {
        // Establish a unique identifier for each transaction
        if (!_transactionID.has(next)) {
          let transactionID = _transactionID.get(this)
          // Set transaction's ID and increment The next ID
          _transactionID.set(next, transactionID)
          _transactionID.set(this, transactionID + 1)
          await transactionDB.setItem('nextID', _transactionID.get(this))
        }
        try {
          await next.run()
          let backup = await transactionDB.getItem(`${_transactionID.get(next)}`)
          if (backup) {
            let failures = _failures.get(this)
            let index = failures.findIndex(failure => failure.id === _transactionID.get(next))
            if (index > -1) {
              failures.splice(index, 1)
              await transactionDB.setItem('failures', failures)
            }
            await transactionDB.removeItem(`${_transactionID.get(next)}`)
          }
        } catch (ex) {
          if (next.isRecoverable) {
            // Save a serialized version of the transaction
            let transactionID = _transactionID.get(next)
            let failures = _failures.get(this)
            let failure = failures.find(failure => failure.id === transactionID)
            if (!failure) {
              failure = { id: transactionID, retryCount: 0 }
              failures.push(failure)
              await transactionDB.setItem('failures', failures)
            } else {
              failure.retryCount++
              await transactionDB.setItem('failures', failures)
            }
            await transactionDB.setItem(`${transactionID}`, next.toJSON())
            let retry = next
            setTimeout(() => {
              this.run(retry)
            }, 500 * fibSequence(failure.retryCount))
          }
        }
        next = transactionQueue.pop()
      }
      _isRunning.set(this, false)
    }
  }
}
export let transactionQueue = new TransactionQueue()

const api = {
  '/v1/run': function (description, recoverable, steps) {
    // If there are arguments then they want to run a specific transaction
    // Otherwise start the queue
    if (arguments.length) {
      let transaction = new Transaction(description, recoverable)
      for (let step of steps) {
        // You may set variables with an array of names/value or a single name/value
        if (step.execute === 'setInScope') {
          for (let key of Object.keys(step.args)) {
            console.log(key, step.args[key])
            transaction.setInScope(key, step.args[key])
          }
        } else {
          transaction.addStep(step)
        }
      }
      transactionQueue.run(transaction)
      return transaction.wait()
    } else {
      transactionQueue.run()
    }
  },
  '/v1/enqueue': function (description, recoverable, steps) {
    let transaction = new Transaction(description, recoverable)
    for (let step of steps) {
      // You may set variables with an array of names/value or a single name/value
      if (step.execution === 'setInScope') {
        for (let key of Object.keys(step.args)) {
          transaction.setInScope(key, step.args[key])
        }
      } else {
        transaction.addStep(step)
      }
    }
    transactionQueue.enqueue(transaction)
  }
}
sbp.registerDomain('transactions', api)
