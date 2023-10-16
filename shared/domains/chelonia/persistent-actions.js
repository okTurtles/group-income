'use strict'

import sbp from '@sbp/sbp'
import { LOGIN } from '~/frontend/utils/events.js'

type SbpInvocation = any[]

type PersistentActionOptions = {
  errorInvocation?: SbpInvocation,
  // Maximum number of tries, default: Infinity.
  maxAttempts: number,
  // How many seconds to wait between retries.
  retrySeconds: number,
  skipCondition?: SbpInvocation,
  // SBP selector to call on success with the received value.
  successInvocationSelector?: string,
  totalFailureInvocation?: SbpInvocation
}

type PersistentActionStatus = {
  cancelled: boolean,
  failedAttemptsSoFar: number,
  lastError: string,
  nextRetry: string,
  pending: boolean
}

const defaultOptions: PersistentActionOptions = {
  maxAttempts: Number.POSITIVE_INFINITY,
  retrySeconds: 30
}
const tag = '[chelonia.persistentActions]'

class PersistentAction {
  invocation: SbpInvocation
  options: PersistentActionOptions
  status: PersistentActionStatus
  timer: Object

  constructor (invocation: SbpInvocation, options: PersistentActionOptions = {}) {
    this.invocation = invocation
    this.options = { ...defaultOptions, ...options }
    this.status = {
      cancelled: false,
      failedAttemptsSoFar: 0,
      lastError: '',
      nextRetry: '',
      pending: false
    }
  }

  // Do not call if the action is pending or cancelled!
  async attempt (): Promise<void> {
    if (await this.trySBP(this.options.skipCondition)) {
      this.cancel()
      return
    }
    try {
      this.status.pending = true
      const result = await sbp(...this.invocation)
      this.handleSuccess(result)
    } catch (error) {
      this.handleError(error)
    }
  }

  cancel (): void {
    this.timer && clearTimeout(this.timer)
    this.status.cancelled = true
    this.status.nextRetry = ''
  }

  async handleError (error: Error): Promise<void> {
    const { options, status } = this
    // Update relevant status fields before calling any optional selector.
    status.failedAttemptsSoFar++
    status.lastError = error.message
    const anyAttemptLeft = options.maxAttempts > status.failedAttemptsSoFar
    status.nextRetry = anyAttemptLeft && !status.cancelled
      ? new Date(Date.now() + options.retrySeconds * 1e3).toISOString()
      : ''
    // Perform any optional SBP invocation.
    await this.trySBP(options.errorInvocation)
    !anyAttemptLeft && await this.trySBP(options.totalFailureInvocation)
    // Schedule a retry if appropriate.
    if (status.nextRetry) {
      // Note: there should be no older active timeout to clear.
      this.timer = setTimeout(() => this.attempt(), this.options.retrySeconds * 1e3)
    }
    status.pending = false
  }

  async handleSuccess (result: any): Promise<void> {
    const { status } = this
    status.lastError = ''
    status.nextRetry = ''
    status.pending = false
    this.options.successInvocationSelector &&
      await this.trySBP([this.options.successInvocationSelector, result])
  }

  trySBP (invocation: SbpInvocation | void): any {
    try {
      return invocation ? sbp(...invocation) : undefined
    } catch (error) {
      console.error(tag, error.message)
    }
  }
}

// SBP API

sbp('sbp/selectors/register', {
  'chelonia.persistentActions/_init' (): void {
    sbp('okTurtles.events/on', LOGIN, (function () {
      this.actionsByID = Object.create(null)
      this.databaseKey = `chelonia/persistentActions/${sbp('state/vuex/getters').ourIdentityContractId}`
      this.nextID = 0
      // Necessary for now as _init cannot be async.
      this.ready = false
      sbp('chelonia.persistentActions/_load')
        .then(() => sbp('chelonia.persistentActions/retryAll'))
    }.bind(this)))
  },

  // Called on login to load the correct set of actions for the current user.
  async 'chelonia.persistentActions/_load' (): Promise<void> {
    const { actionsByID = {}, nextID = 0 } = (await sbp('chelonia/db/get', this.databaseKey)) ?? {}
    for (const id in actionsByID) {
      this.actionsByID[id] = new PersistentAction(actionsByID[id].invocation, actionsByID[id].options)
    }
    this.nextID = nextID
    this.ready = true
  },

  // Updates the database version of the pending action list.
  'chelonia.persistentActions/_save' (): Promise<Error | void> {
    return sbp(
      'chelonia/db/set',
      this.databaseKey,
      { actionsByID: JSON.stringify(this.actionsByID), nextID: this.nextID }
    )
  },

  // === Public Selectors === //

  'chelonia.persistentActions/enqueue' (...args): number[] {
    if (!this.ready) throw new Error(`${tag} Not ready yet.`)
    const ids: number[] = []
    for (const arg of args) {
      const id = this.nextID++
      this.actionsByID[id] = Array.isArray(arg)
        ? new PersistentAction(arg)
        : new PersistentAction(arg.invocation, arg)
      ids.push(id)
    }
    // Likely no need to await this call.
    sbp('chelonia.persistentActions/_save')
    for (const id of ids) this.actionsByID[id].attempt()
    return ids
  },

  // Cancels a specific action by its ID.
  // The action won't be retried again, but an async action cannot be aborted if its promise is stil pending.
  'chelonia.persistentActions/cancel' (id: number): void {
    if (id in this.actionsByID) {
      this.actionsByID[id].cancel()
      delete this.actionsByID[id]
      // Likely no need to await this call.
      sbp('chelonia.persistentActions/_save')
    }
  },

  // Forces retrying an existing persisted action given its ID.
  // Note: 'failedAttemptsSoFar' will still be increased upon failure.
  async 'chelonia.persistentActions/forceRetry' (id: number): Promise<void> {
    if (id in this.actionsByID) {
      const action = this.actionsByID[id]
      // Bail out if the action is already pending or cancelled.
      if (action.status.pending || action.status.cancelled) return
      try {
        await action.attempt()
        // If the action succeded, delete it and update the DB.
        delete this.actionsByID[id]
        sbp('chelonia.persistentActions/_save')
      } catch {
        // Do nothing.
      }
    }
  },

  // Retry all existing persisted actions.
  // TODO: add some delay between actions so as not to spam the server,
  // or have a way to issue them all at once in a single network call.
  'chelonia.persistentActions/retryAll' (): void {
    for (const id in this.actionsByID) {
      sbp('chelonia.persistentActions/forceRetry', id)
    }
  }
})
