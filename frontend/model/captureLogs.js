import sbp from '~/shared/sbp.js'
import { CAPTURED_LOGS, SET_APP_LOGS_FILTER } from '~/frontend/utils/events.js'

/*
  giConsole/count - total logs stored
  giConsole/lastEntry - latest log hash.
  giConsole/markers - an array of markers at every 1000th entry.
*/
const ENTRIES_LIMIT = 4000
const ENTRIES_MARKER = 1000

const getMarkers = () => JSON.parse(localStorage.getItem('giConsole/markers')) || []

// these are initialized at captureLogsStart()
let isCapturing = false
let isConsoleOveridden = false
let lastEntry = null
let entriesCount = null
let appLogsFilter = []

function captureLog (type, ...msg) {
  const logEntry = `${Date.now()}_${Math.floor(Math.random() * 100000)}` // uuid

  // detect when is an Error and capture it properly
  // ex: uncaught Vue errors or custom try/catch errors.
  msg = msg.map((m) => m instanceof Error ? (JSON.stringify(m.stack) || m) : m)

  localStorage.setItem(`giConsole/${logEntry}`,
    JSON.stringify({
      type,
      msg,
      prev: lastEntry,
      timestamp: new Date().toISOString()
    })
  )

  lastEntry = logEntry
  entriesCount++

  localStorage.setItem('giConsole/lastEntry', logEntry)
  localStorage.setItem('giConsole/count', entriesCount)

  verifyLogsSize()

  // To avoid infinite loop because we log all selector calls, we run sbp calls
  // here in a roundabout way by getting the function to which they're mapped.
  // The reason this works is because the entire `sbp` domain is blacklisted
  // from being logged in main.js.
  sbp('sbp/selectors/fn', 'okTurtles.events/emit')(CAPTURED_LOGS, lastEntry)
}

function verifyLogsSize () {
  if (entriesCount % ENTRIES_MARKER === 0) {
    const markers = getMarkers()
    // Save entry as a marker to be later deleted when logs are too big.
    markers.push(lastEntry)
    localStorage.setItem('giConsole/markers', JSON.stringify(markers))
  }

  if (entriesCount >= ENTRIES_LIMIT) {
    const markers = getMarkers()
    let toDelete = ENTRIES_MARKER // delete the latest x entries
    let prevEntry = markers.shift()
    do {
      const entry = JSON.parse(localStorage.getItem(`giConsole/${prevEntry}`)) || {}
      localStorage.removeItem(`giConsole/${prevEntry}`)
      prevEntry = entry.prev
      entriesCount--
      toDelete--
    } while (toDelete && prevEntry)
    localStorage.setItem('giConsole/markers', JSON.stringify(markers))
    localStorage.setItem('giConsole/count', entriesCount)
  }
}

export function captureLogsStart () {
  console.debug('captureLogsStart called')
  isCapturing = true
  lastEntry = localStorage.getItem('giConsole/lastEntry')
  entriesCount = +localStorage.getItem('giConsole/count') || 0
  appLogsFilter = sbp('state/vuex/state').appLogsFilter || []
  // Subscribe to appLogsFilter
  sbp('okTurtles.events/on', SET_APP_LOGS_FILTER, filter => { appLogsFilter = filter })

  // Override the console to start capturing the logs
  if (!isConsoleOveridden) {
    // avoid duplicated captures, in case captureLogsStart
    // is called multiple times. (ex: login twice in the same visit)
    isConsoleOveridden = true

    // NOTE: Find a way to capture logs without messing up with log file location.
    // console.log() doesnt include stack trace, so when logged, we can't access
    // where the log came from (file name), which difficults debugging if needed.
    window.console = new Proxy(window.console, {
      get: (obj, type) => (...args) => {
        obj[type](...args)
        if (isCapturing && appLogsFilter.includes(type)) {
          captureLog(type, ...args)
        }
      }
    })
  }

  // Set a new visit or session - useful to understand logs through time.
  // NEW_SESSION -> The user opened a new browser or tab.
  // NEW_VISIT -> The user comes from an ongoing session (refresh or login)
  const isNewSession = !sessionStorage.getItem('NEW_SESSION')
  if (isNewSession) { sessionStorage.setItem('NEW_SESSION', 1) }
  captureLog(isNewSession ? 'NEW_SESSION' : 'NEW_VISIT')
}

export function captureLogsPause () {
  isCapturing = false
  sbp('okTurtles.events/off', SET_APP_LOGS_FILTER)
}

// Util to download *all* stored logs so far
export function downloadLogs (elLink) {
  const filename = 'gi_logs.json'
  const appLogsArr = []
  let lastEntry = localStorage.getItem('giConsole/lastEntry')
  do {
    const entry = localStorage.getItem(`giConsole/${lastEntry}`)
    if (!entry) break
    const entryParsed = JSON.parse(entry)
    lastEntry = entryParsed.prev
    appLogsArr.push(entry)
  } while (lastEntry)
  appLogsArr.reverse() // chronological order (oldest to most recent)

  const file = new Blob([JSON.stringify({
    // Add instructions in case the user opens the file.
    '_instructions': 'GROUP INCOME - Application Logs - Attach this file when reporting an issue: https://github.com/okTurtles/group-income-simple/issues',
    'ua': navigator.userAgent,
    // stringify logs upront because it's an array...
    logs: JSON.stringify(appLogsArr)
  })], { type: 'application/json' })

  if (window.navigator.msSaveOrOpenBlob) {
    // IE10+ and Edge
    console.log('download using MS API')
    window.navigator.msSaveOrOpenBlob(file, filename)
  } else {
    console.log('download using URL obj')

    const url = URL.createObjectURL(file)
    elLink.href = url
    elLink.download = filename
    elLink.click()
    setTimeout(() => {
      elLink.href = '#'
      window.URL.revokeObjectURL(url)
    }, 0)
  }
}

export function clearLogs () {
  let i = localStorage.length
  while (i--) {
    const key = localStorage.key(i)
    if (/giConsole/.test(key)) {
      localStorage.removeItem(key)
    }
  }
  lastEntry = ''
  entriesCount = 0
}
