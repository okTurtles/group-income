import sbp from '@sbp/sbp'
import { CAPTURED_LOGS, SET_APP_LOGS_FILTER } from '~/frontend/utils/events.js'
import CircularList from '~/shared/CircularList.js'
import { L } from '@common/common.js'

/*
  - giConsole/[username]/entries - the stored log entries.
  - giConsole/[username]/config - the logger config used.
*/

const config = {
  maxEntries: 2000
}
const consoleCopy = { ...console }
const loggingLevels = ['debug', 'error', 'info', 'log', 'warn']
const noop = () => undefined
const originalConsole = console

// These are initialized in `captureLogsStart()`.
let appLogsFilter: string[] = []
let logger: Object = null
let identityContractID: string = ''

// A default storage backend using `localStorage`.
const getItem = (key: string): ?string => localStorage.getItem(`giConsole/${identityContractID}/${key}`)
const removeItem = (key: string): void => localStorage.removeItem(`giConsole/${identityContractID}/${key}`)
const setItem = (key: string, value: any): void => {
  localStorage.setItem(`giConsole/${identityContractID}/${key}`, typeof value === 'string' ? value : JSON.stringify(value))
}

function createLogger (config: Object): Object {
  const entries = new CircularList(config.maxEntries)
  const methods = loggingLevels.reduce(
    (acc, name) => {
      acc[name] = (...args) => {
        originalConsole[name](...args)
        captureLogEntry(name, ...args)
      }
      return acc
    },
    {}
  )
  return {
    entries,
    ...methods,
    save () {
      try {
        setItem('entries', this.entries.toArray())
      } catch (error) {
        console.error(error)
      }
    }
  }
}

function captureLogEntry (type, ...args) {
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    // Detect when arg is an Error and capture it properly.
    // ex: uncaught Vue errors or custom try/catch errors.
    msg: args.map((arg) => {
      try {
        return JSON.parse(
          JSON.stringify(arg, (_, v) => {
            if (v instanceof Error) {
              return {
                name: v.name,
                message: v.message,
                stack: v.stack
              }
            }
            return v
          })
        )
      } catch (e) {
        return `[captureLogs failed to stringify argument of type '${typeof arg}'. Err: ${e.message}]`
      }
    })
  }
  getLogger().entries.add(entry)
  // To avoid infinite loop because we log all selector calls, we run sbp calls
  // here in a roundabout way by getting the function to which they're mapped.
  // The reason this works is because the entire `sbp` domain is blacklisted
  // from being logged in main.js.
  sbp('sbp/selectors/fn', 'okTurtles.events/emit')(CAPTURED_LOGS, entry)
  sbp('sbp/selectors/fn', 'appLogs/logServer')(type, JSON.stringify(entry.msg))
}

function captureLogsStart (userLogged: string) {
  identityContractID = userLogged

  logger = getLogger()

  // Save the new config.
  setItem('config', config)

  setAppLogsFilter(sbp('state/vuex/state').settings?.appLogsFilter ?? [])

  // Subscribe to `appLogsFilter` changes.
  sbp('okTurtles.events/on', SET_APP_LOGS_FILTER, setAppLogsFilter)

  // Overwrite the original console.
  window.console = consoleCopy

  // Set a new visit or session - useful to understand logs through time.
  // NEW_SESSION -> The user opened a new browser or tab.
  // NEW_VISIT -> The user comes from an ongoing session (refresh or login).
  const isNewSession = !sessionStorage.getItem('NEW_SESSION')
  if (isNewSession) { sessionStorage.setItem('NEW_SESSION', '1') }
  console.log(isNewSession ? 'NEW_SESSION' : 'NEW_VISIT', 'Starting to capture logs of type:', appLogsFilter)
}

function captureLogsPause ({ wipeOut }: { wipeOut: boolean }): void {
  if (wipeOut) { clearLogs() }
  sbp('okTurtles.events/off', SET_APP_LOGS_FILTER)
  console.log('captureLogs paused')
  // Restore original console behavior.
  window.console = originalConsole
}

function clearLogs () {
  removeItem('entries')
  logger?.entries?.clear()
}

// Util to download all stored logs so far.
function downloadOrShareLogs (actionType: 'share' | 'download', elLink?: HTMLAnchorElement): any {
  const filename = 'gi_logs.json.txt'
  const mimeType = 'text/plain'

  const blob = new Blob([JSON.stringify({
    // Add instructions in case the user opens the file.
    _instructions: 'GROUP INCOME - Application Logs - Attach this file when reporting an issue: https://github.com/okTurtles/group-income/issues',
    ua: navigator.userAgent,
    logs: getLogger().entries.toArray()
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

function getLogger (): Object {
  if (!logger) {
    logger = createLogger(config)
    const previousEntries = JSON.parse(getItem('entries') ?? '[]')

    // If `maxEntries` is changed in a release, this will discard oldest logs as necessary.
    if (config.maxEntries < previousEntries.length) {
      previousEntries.splice(0, previousEntries.length - config.maxEntries)
    }
    // Load the previous entries to sync the in-memory array with the local storage.
    if (previousEntries.length) {
      logger.entries.addAll(previousEntries)
    }
  }
  return logger
}

function setAppLogsFilter (filter: Array<string>) {
  appLogsFilter = filter
  // NOTE: Find a way to capture logs without messing up with log file location.
  // console.log() doesnt include stack trace, so when logged, we can't access
  // where the log came from (file name), which} difficults debugging if needed.
  for (const level of loggingLevels) {
    // $FlowFixMe
    consoleCopy[level] = appLogsFilter.includes(level) ? logger[level] : noop
  }
}

window.addEventListener('beforeunload', event => sbp('appLogs/save'))

sbp('sbp/selectors/register', {
  'appLogs/downloadOrShare': downloadOrShareLogs,
  'appLogs/get' () { return getLogger()?.entries?.toArray() ?? [] },
  'appLogs/save' () { getLogger()?.save() },
  'appLogs/pauseCapture': captureLogsPause,
  'appLogs/startCapture': captureLogsStart,
  'appLogs/logServer': process.env.NODE_ENV !== 'development'
    ? noop
    : function (level, string) {
      if (window.location.href.startsWith('https://gi')) {
        fetch(`${sbp('okTurtles.data/get', 'API_URL')}/log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ level, value: string })
        }).catch(e => {
          originalConsole.error(`[captureLogs] '${e.message}' attempting to log [${level}] to server:`, string)
        })
      }
    }
})
