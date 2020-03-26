import sbp from '~/shared/sbp.js'
import { CAPTURED_LOGS, SET_APP_LOGS_FILTER } from '~/frontend/utils/events.js'

/*
  - giConsole/count - total logs stored
  - giConsole/lastEntry - latest log hash
  - giConsole/limit - the limit of entries.
  - giConsole/markers - an array of markers at every nth entry
  - giConsole/markerNth - the nth index in which marker log
*/

// Configuration:
const ENTRIES_LIMIT = 5000
const ENTRIES_MARKER_NTH = 1000

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
  msg = msg.map((m) => m instanceof Error ? (m.stack || m.message) : m)

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

  verifyEntryIsMarker()
  verifyLogsSize()

  // To avoid infinite loop because we log all selector calls, we run sbp calls
  // here in a roundabout way by getting the function to which they're mapped.
  // The reason this works is because the entire `sbp` domain is blacklisted
  // from being logged in main.js.
  sbp('sbp/selectors/fn', 'okTurtles.events/emit')(CAPTURED_LOGS, lastEntry)
}

function verifyEntryIsMarker () {
  if (entriesCount % ENTRIES_MARKER_NTH === 0) {
    const markers = getMarkers()
    // Save entry as a marker to be later deleted when logs are too big.
    markers.push(lastEntry)
    localStorage.setItem('giConsole/markers', JSON.stringify(markers))
  }
}

function verifyLogsSize () {
  if (entriesCount >= ENTRIES_LIMIT) {
    const markers = getMarkers()
    let toDelete = ENTRIES_MARKER_NTH
    let oldestEntry = markers.shift() // the oldest marker
    do {
      const log = JSON.parse(localStorage.getItem(`giConsole/${oldestEntry}`)) || {}
      localStorage.removeItem(`giConsole/${oldestEntry}`)
      entriesCount--
      toDelete--
      oldestEntry = log.prev
    } while (toDelete && oldestEntry)

    localStorage.setItem('giConsole/markers', JSON.stringify(markers))
    localStorage.setItem('giConsole/count', entriesCount)

    // Delete nth oldest logs recursively. This scenario can happen when the
    // entries limit is changed. Example: There are 400 logs and the limit is 500.
    // We change the limit to 100 and the marker nth to 25. 325 logs need to be deleted.
    // We do it recursively in chunks of 25 until there's only 75 logs again.
    verifyLogsSize()
  }
}

function verifyLogsConfigs () {
  // If ENTRIES_LIMIT or ENTRIES_MARKER_NTH are changed in a release
  // we need to recalculate markers and verify if it reached the size limit.
  const storedLimit = +localStorage.getItem('giConsole/limit')
  const storedMarkerNth = +localStorage.getItem('giConsole/markerNth')

  // when it's the first time running this, just set the correct limits
  if (storedLimit === 0) {
    localStorage.setItem('giConsole/limit', ENTRIES_LIMIT)
    localStorage.setItem('giConsole/markerNth', ENTRIES_MARKER_NTH)
    return
  }

  if (storedMarkerNth !== ENTRIES_MARKER_NTH) {
    // recalculate markers based on new nth rule.
    const newMarkers = []
    let entryIndex = entriesCount
    let prevEntry = lastEntry
    do {
      const log = JSON.parse(localStorage.getItem(`giConsole/${prevEntry}`))
      if (!log) break
      if (entryIndex % ENTRIES_MARKER_NTH === 0) {
        newMarkers.push(prevEntry)
      }
      entryIndex--
      prevEntry = log.prev
    } while (prevEntry)
    // reverse new markers to be in chronological order, and then store them.
    localStorage.setItem('giConsole/markers', JSON.stringify(newMarkers.reverse()))
    localStorage.setItem('giConsole/markerNth', ENTRIES_MARKER_NTH)
  }

  if (storedLimit !== ENTRIES_LIMIT) {
    localStorage.setItem('giConsole/limit', ENTRIES_LIMIT)
    verifyLogsSize()
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

  verifyLogsConfigs()

  // Override the console to start capturing the logs
  if (!isConsoleOveridden) {
    // avoid duplicated captures, in case captureLogsStart gets
    // called multiple times. (ex: login twice in the same visit)
    isConsoleOveridden = true

    // NOTE: Find a way to capture logs without messing up with log file location.
    // console.log() doesnt include stack trace, so when logged, we can't access
    // where the log came from (file name), which difficults debugging if needed.
    window.console = new Proxy(window.console, {
      get: (obj, type) => (...args) => {
        if (appLogsFilter.includes(type)) {
          obj[type](...args)
          isCapturing && captureLog(type, ...args)
        }
      }
    })
  }

  // Set a new visit or session - useful to understand logs through time.
  // NEW_SESSION -> The user opened a new browser or tab.
  // NEW_VISIT -> The user comes from an ongoing session (refresh or login)
  const isNewSession = !sessionStorage.getItem('NEW_SESSION')
  if (isNewSession) { sessionStorage.setItem('NEW_SESSION', 1) }
  console.info(isNewSession ? 'NEW_SESSION' : 'NEW_VISIT', 'Starting to capture logs of type:', appLogsFilter)
}

export function captureLogsPause () {
  isCapturing = false
  sbp('okTurtles.events/off', SET_APP_LOGS_FILTER)
}

// Util to download all stored logs so far
export function downloadLogs (elLink) {
  const filename = 'gi_logs.json'
  const appLogsArr = []
  let prevEntry = localStorage.getItem('giConsole/lastEntry')
  do {
    const log = localStorage.getItem(`giConsole/${prevEntry}`)
    if (!log) break
    prevEntry = JSON.parse(log).prev
    appLogsArr.push(log)
  } while (prevEntry)
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
