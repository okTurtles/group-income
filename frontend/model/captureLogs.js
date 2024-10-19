import sbp from '@sbp/sbp'
import { SET_APP_LOGS_FILTER } from '~/frontend/utils/events.js'
import { MAX_LOG_ENTRIES } from '~/frontend/utils/constants.js'
import { L } from '@common/common.js'
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

// A default storage backend using `sessionStorage`.
const getItem = (key: string): ?string => sessionStorage.getItem(`giConsole/${identityContractID}/${key}`)
const removeItem = (key: string): void => sessionStorage.removeItem(`giConsole/${identityContractID}/${key}`)
const setItem = (key: string, value: any): void => {
  sessionStorage.setItem(`giConsole/${identityContractID}/${key}`, typeof value === 'string' ? value : JSON.stringify(value))
}

async function captureLogsStart (userLogged: string) {
  identityContractID = userLogged

  logger = await createLogger(config, { getItem, removeItem, setItem })

  // Save the new config.
  setItem('config', config)

  logger.setAppLogsFilter(sbp('state/vuex/state').settings?.appLogsFilter ?? [])

  // Subscribe to `appLogsFilter` changes.
  sbp('okTurtles.events/on', SET_APP_LOGS_FILTER, logger.setAppLogsFilter)

  // Overwrite the original console.
  self.console = logger.console

  // Set a new visit or session - useful to understand logs through time.
  // NEW_SESSION -> The user opened a new browser or tab.
  // NEW_VISIT -> The user comes from an ongoing session (refresh or login).
  const isNewSession = !sessionStorage.getItem('NEW_SESSION')
  if (isNewSession) { sessionStorage.setItem('NEW_SESSION', '1') }
  originalConsole.log(isNewSession ? 'NEW_SESSION' : 'NEW_VISIT', 'Starting to capture logs of type:', logger.appLogsFilter)
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

// Util to download all stored logs so far.
function downloadOrShareLogs (actionType: 'share' | 'download', elLink?: HTMLAnchorElement): any {
  const filename = 'gi_logs.json.txt'
  const mimeType = 'text/plain'

  const blob = new Blob([JSON.stringify({
    // Add instructions in case the user opens the file.
    _instructions: 'GROUP INCOME - Application Logs - Attach this file when reporting an issue: https://github.com/okTurtles/group-income/issues',
    ua: navigator.userAgent,
    logs: logger?.entries.toArray()
  }, undefined, 2)], { type: mimeType })

  if (actionType === 'download') {
    if (!elLink) { return }

    const url = URL.createObjectURL(blob)
    elLink.href = url
    elLink.download = filename
    elLink.click()
    setTimeout(() => {
      elLink.href = '#'
      URL.revokeObjectURL(url)
    }, 0)
  } else {
    return window.navigator.share({
      files: [new File([blob], filename, { type: blob.type })],
      title: L('Application Logs')
    })
  }
}

// The reason to use the 'visibilitychange' event over the 'beforeunload' event
// is that the latter is unreliable on mobile. For example, if a tab is set to
// the background and then closed, the 'beforeunload' event may never be fired.
// Furthermore, 'beforeunload' has implications for how the bfcache works.
window.addEventListener('visibilitychange', event => sbp('appLogs/save').catch(e => {
  console.error('Error saving logs during visibilitychange event handler', e)
}))

// Enable logging to the server
logServer(originalConsole)

export default (sbp('sbp/selectors/register', {
  'appLogs/downloadOrShare': downloadOrShareLogs,
  'appLogs/get' () { return logger?.entries.toArray() ?? [] },
  async 'appLogs/save' () { await logger?.save() },
  'appLogs/pauseCapture': captureLogsPause,
  'appLogs/startCapture': captureLogsStart,
  async 'appLogs/clearLogs' (userID) {
    const savedID = identityContractID
    identityContractID = userID
    try { await clearLogs() } catch {}
    identityContractID = savedID
  }
}): string[])
