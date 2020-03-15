import sbp from '~/shared/sbp.js'
import { CAPTURED_LOGS } from '~/frontend/utils/events.js'

const initialLogs = localStorage.getItem(CAPTURED_LOGS)

// Mark at localStorage a new visit
const setNewSession = [
  ...(JSON.parse(initialLogs) || []),
  {
    type: 'NEW_VISIT',
    msg: `${new Date().toUTCString()}`
  }
]
localStorage.setItem(CAPTURED_LOGS, JSON.stringify(setNewSession))

// Create a middleware to capture new console logs...
const giConsole = (function (csl) {
  return {
    log: function (...args) {
      csl.log(...args)
    },
    info: function (...args) {
      csl.info(...args)
    },
    warn: function (...args) {
      csl.warn(...args)
      captureMsg('warn', ...args)
    },
    error: function (...args) {
      csl.error(...args)
      captureMsg('error', ...args)
    },
    debug: function (...args) {
      csl.debug(...args)
      captureMsg('debug', ...args)
    }
  }
}(window.console))

function captureMsg (type, ...msg) {
  const capturedSoFar = JSON.parse(localStorage.getItem(CAPTURED_LOGS)) || []

  // TODO - Verify if store is fulled.
  // How: https://stackoverflow.com/questions/4391575/how-to-find-the-size-of-localstorage
  // If yes, do some type of cleanup.
  // Perhaps delete all logs before the last session?

  localStorage.setItem(CAPTURED_LOGS, JSON.stringify(
    [...capturedSoFar, { type, msg }]
  ))

  sbp('okTurtles.events/emit', CAPTURED_LOGS)
}

// Then redefine the original console
window.console = giConsole
