'use strict'

import sbp from '@sbp/sbp'
import { CONNECTION_RESTART_SELECTOR, CONNECTION_STATUS_SELECTOR } from '../utils/constants.js'
import { callWithTimeout } from '../utils/timers.js'
import type { RestartReason } from './serviceworkers/reconnectionPolicy.js'

// A request to a service worker that was terminated can stay unanswered
export const CONNECTION_STATUS_TIMEOUT = 10 * 1000

// The service worker's connection status (`sw/connection/status`, see
// `serviceworkers/connectionMonitor.js`). Rejects after `timeout`, and with a
// service worker older than the selector.
export const requestConnectionStatus = ({ getStatus = () => sbp(CONNECTION_STATUS_SELECTOR), timeout = CONNECTION_STATUS_TIMEOUT }: {|
  getStatus?: () => mixed, timeout?: number
|} = {}): Promise<mixed> => callWithTimeout(getStatus, timeout, 'Timed out getting the connection status')

// The rejection of a service worker older than `sw/connection/status`
// (`@sbp/sbp`'s message, passed on by the tab <-> SW RPC). Only this
// selector: another one missing is a bug, not an older service worker.
export const isStatusUnavailableError = (e: mixed): boolean =>
  (e: any)?.message === `SBP: selector not registered: ${CONNECTION_STATUS_SELECTOR}`

// Asks the service worker to restart its reconnection cycle
// (`sw/connection/restart`, see `serviceworkers/reconnectionPolicy.js`).
// Rejects after `timeout`, so that a busy service worker doesn't keep the
// caller waiting, and with a service worker older than the selector.
export const requestConnectionRestart = (reason: RestartReason, { restart = (reason) => sbp(CONNECTION_RESTART_SELECTOR, reason), timeout = CONNECTION_STATUS_TIMEOUT }: {|
  restart?: (reason: RestartReason) => mixed, timeout?: number
|} = {}): Promise<mixed> => callWithTimeout(() => restart(reason), timeout, 'Timed out restarting the connection')

// Like `isStatusUnavailableError`, for `sw/connection/restart`
export const isRestartUnavailableError = (e: mixed): boolean =>
  (e: any)?.message === `SBP: selector not registered: ${CONNECTION_RESTART_SELECTOR}`

// `requestConnectionRestart()` without waiting for it, e.g., whenever the tab
// becomes visible. Never rejects. Nothing is logged for a service worker
// older than the selector: it has no reconnection cycle to restart.
export const restartConnectionInBackground = (reason: RestartReason, options?: {|
  restart?: (reason: RestartReason) => mixed, timeout?: number
|}): Promise<void> => requestConnectionRestart(reason, options).then(() => {}, (e) => {
  if (!isRestartUnavailableError(e)) console.warn(`[connection] Could not restart the reconnection cycle (${reason})`, e)
})
