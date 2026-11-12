'use strict'

import sbp from '@sbp/sbp'
import type { Timers } from '../utils/timers.js'
import { callWithTimeout, defaultTimers } from '../utils/timers.js'

// A request to a service worker that was terminated can stay unanswered
export const CONNECTION_STATUS_TIMEOUT = 10 * 1000

// The service worker's connection status (`sw/connection/status`, see
// `serviceworkers/connectionMonitor.js`). Rejects after `timeout`, and with a
// service worker older than the selector.
export const requestConnectionStatus = ({ getStatus = () => sbp('sw/connection/status'), timeout = CONNECTION_STATUS_TIMEOUT, timers = defaultTimers }: {
  getStatus?: () => mixed, timeout?: number, timers?: Timers
} = {}): Promise<mixed> => callWithTimeout(getStatus, timeout, 'Timed out getting the connection status', timers)

// The rejection of a service worker older than `sw/connection/status`
// (`@sbp/sbp`'s message, passed on by the tab <-> SW RPC)
export const isStatusUnavailableError = (e: mixed): boolean =>
  typeof (e: any)?.message === 'string' && (e: any).message.startsWith('SBP: selector not registered:')
