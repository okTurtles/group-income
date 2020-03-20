import sbp from '~/shared/sbp.js'
import { CAPTURED_LOGS } from '~/frontend/utils/events.js'

const SIZE_LIMIT_KB = 100
const isNewSession = !sessionStorage.getItem('NEW_SESSION')
const initialLogs = localStorage.getItem(CAPTURED_LOGS)

// Mark in localStorage that is a new visit (and session)
if (isNewSession) { sessionStorage.setItem('NEW_SESSION', 1) }

const setNewEntry = [
  ...(JSON.parse(initialLogs) || []),
  {
    type: isNewSession ? 'NEW_SESSION' : 'NEW_VISIT',
    msg: Date.now()
  }
]

localStorage.setItem(CAPTURED_LOGS, JSON.stringify(setNewEntry))

// Redefine the original console
window.console = new Proxy(window.console, {
  get: function (obj, type) {
    return function (...args) {
      obj[type](...args)
      if (['error', 'warn', 'debug'].includes(type)) {
        captureMsg(type, ...args)
      }
    }
  }
})

function captureMsg (type, ...msg) {
  const logs = localStorage.getItem(CAPTURED_LOGS)
  const logsParsed = JSON.parse(logs) || []

  // Reference: https://stackoverflow.com/a/15720835/4737729
  // REVIEW: Cut the log from a better place? Maybe since last session?
  var size = logs ? logs.length * 2 / 1024 : 0
  if (size > SIZE_LIMIT_KB) {
    console.log(`LocalStorage is too big. (${size}Kb). Deleting 2/3 of it.`)
    logsParsed.splice(0, Math.round(logsParsed.length / 1.5))
  }

  localStorage.setItem(CAPTURED_LOGS, JSON.stringify(
    [...logsParsed, { type, msg }]
  ))

  sbp('okTurtles.events/emit', CAPTURED_LOGS)
}

// Util function to download *all* stored logs.
export function downloadLogs (filename, elLink) {
  const data = `/*
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 

GROUP INCOME - Application Logs

Attach this file when reporting a problem at: 
  - Github: https://github.com/okTurtles/group-income-simple/issues  

. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
*/

var userAgent = ${navigator.userAgent}
var appLogs = ${localStorage.getItem(CAPTURED_LOGS)}`

  const file = new Blob([data], { type: 'text/plain' })

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
