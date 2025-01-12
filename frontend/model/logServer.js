import sbp from '@sbp/sbp'
import '@sbp/okturtles.events'
import { CAPTURED_LOGS } from '~/frontend/utils/events.js'

export default (console: Object): Function => {
  // only log to server if we're in development mode and connected over the
  // tunnel (which creates URLs that begin with 'https://gi' per Gruntfile.js)
  if (process.env.NODE_ENV !== 'development' || !self.location.href.startsWith('https://gi')) return

  sbp('okTurtles.events/on', CAPTURED_LOGS, ({ level, msg: stringifyMe }) => {
    if (level === 'debug') return // comment out to send much more log info
    const value = JSON.stringify(stringifyMe)
    // To avoid infinite loop because we log all selector calls, we run sbp calls
    // here in a roundabout way by getting the function to which they're mapped.
    // The reason this works is because the entire `sbp` domain is blacklisted
    // from being logged.
    const apiUrl = sbp('sbp/selectors/fn', 'okTurtles.data/get')('API_URL')
    fetch(`${apiUrl}/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ level, value })
    }).catch(e => {
      console.error(`[captureLogs] '${e.message}' attempting to log [${level}] to server:`, value)
    })
  })
}
