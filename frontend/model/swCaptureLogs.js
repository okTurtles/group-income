import sbp from '@sbp/sbp'
import { debounce } from '@model/contracts/shared/giLodash.js'
import { CAPTURED_LOGS, SET_APP_LOGS_FILTER } from '~/frontend/utils/events.js'
import { MAX_LOG_ENTRIES } from '~/frontend/utils/constants.js'
import { createLogger } from './logger.js'
import logServer from './logServer.js'

/*
  - giConsole/[username]/entries - the stored log entries.
  - giConsole/[username]/config - the logger config used.
*/

const config = {
  maxEntries: MAX_LOG_ENTRIES
}
const originalConsole = self.console

// These are initialized in `captureLogsStart()`.
let logger: Object = null
let identityContractID: string = ''

// A default storage backend using `IndexedDB`.
const getItem = (key: string): Promise<?string> => sbp('gi.db/logs/load', `giConsole/${identityContractID}/${key}`)
const removeItem = (key: string): Promise<void> => sbp('gi.db/logs/delete', `giConsole/${identityContractID}/${key}`)
const setItem = (key: string, value: any): Promise<void> => {
  return sbp('gi.db/logs/save', `giConsole/${identityContractID}/${key}`, typeof value === 'string' ? value : JSON.stringify(value))
}

async function captureLogsStart (userLogged: string) {
  identityContractID = userLogged

  logger = await createLogger(config, { getItem, removeItem, setItem })

  // Save the new config.
  await setItem('config', config)

  // TODO: Get this dynamically
  logger.setAppLogsFilter((((process.env.NODE_ENV === 'development' || new URLSearchParams(location.search).get('debug'))
    ? ['error', 'warn', 'info', 'debug', 'log']
    : ['error', 'warn', 'info']): string[]))

  // Subscribe to `swLogsFilter` changes.
  sbp('okTurtles.events/on', SET_APP_LOGS_FILTER, logger.setAppLogsFilter)

  // Overwrite the original console.
  self.console = logger.console

  originalConsole.log('Starting to capture logs of type:', logger.swLogsFilter)
}

async function captureLogsPause ({ wipeOut }: { wipeOut: boolean }): Promise<void> {
  if (wipeOut) { await clearLogs() }
  sbp('okTurtles.events/off', SET_APP_LOGS_FILTER)
  console.log('captureLogs paused')
  // Restore original console behavior.
  self.console = originalConsole
}

async function clearLogs () {
  await logger?.clear()
}

// In the SW, there's no event to detect when the SW is about to terminate. As
// a result, we must save logs on every saved entry. However, this wouldn't be
// very performant, so we debounce the save instead.
sbp('okTurtles.events/on', CAPTURED_LOGS, debounce(() => {
  logger?.save().catch(e => {
    console.error('Error saving logs during CAPTURED_LOGS event handler', e)
  })
}, 1000))
isNaN(CAPTURED_LOGS, debounce)

// Enable logging to the server
logServer(originalConsole)

export default (sbp('sbp/selectors/register', {
  'swLogs/get' () { return logger?.entries.toArray() ?? [] },
  async 'swLogs/save' () { await logger?.save() },
  'swLogs/pauseCapture': captureLogsPause,
  'swLogs/startCapture': captureLogsStart,
  async 'swLogs/clearLogs' (userID) {
    const savedID = identityContractID
    identityContractID = userID
    try { await clearLogs() } catch {}
    identityContractID = savedID
  }
}): string[])
