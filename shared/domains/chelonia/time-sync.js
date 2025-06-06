import sbp from '@sbp/sbp'

// `wallBase` is the base used to calculate wall time (i.e., time elapsed as one
// would get from, e.g., looking a clock hanging from a wall).
// Although optimistically
// it has a default value to local time, it'll be updated to the server's time
// once `chelonia/private/startClockSync` is called
// From Wikipedia: 'walltime is the actual time taken from the start of a
// computer program to the end. In other words, it is the difference between
// the time at which a task finishes and the time at which the task started.'
let wallBase = Date.now()
// `monotonicBase` is the base used to calculate an offset to apply to `wallBase`
// to estimate the server's current wall time.
let monotonicBase = performance.now()
// `undefined` means the sync process has been stopped, `null` that the current
// request has finished
let resyncTimeout
let watchdog

const syncServerTime = async function () {
  // Get our current monotonic time
  const startTime = performance.now()
  // Now, ask the server for the time
  const time = await this.config.fetch(`${this.config.connectionURL}/time`, { signal: this.abortController.signal })
  const requestTimeElapsed = performance.now()
  if (requestTimeElapsed - startTime > 8000) {
    throw new Error('Error fetching server time: request took too long')
  }
  // If the request didn't succeed, report it
  if (!time.ok) throw new Error('Error fetching server time')
  const serverTime = (new Date(await time.text())).valueOf()
  // If the value could not be parsed, report that as well
  if (Number.isNaN(serverTime)) throw new Error('Unable to parse server time')
  // Adjust `wallBase` based on the elapsed request time. We can't know
  // how long it took for the server to respond, but we can estimate that it's
  // about half the time from the moment we made the request.
  const newMonotonicBase = performance.now()
  wallBase =
    serverTime +
    (requestTimeElapsed - startTime) / 2 +
    // Also take into account the time elapsed between `requestTimeElapsed`
    // and this line (which should be very little)
    (newMonotonicBase - requestTimeElapsed)
  monotonicBase = newMonotonicBase
}

export default (sbp('sbp/selectors/register', {
  'chelonia/private/startClockSync': function () {
    if (resyncTimeout !== undefined) {
      throw new Error('chelonia/private/startClockSync has already been called')
    }
    // Default re-sync every 5 minutes
    const resync = (delay: number = 300000) => {
      // If there's another time sync process in progress, don't do anything
      if (resyncTimeout !== null) return
      const timeout = setTimeout(() => {
        // Get the server time
        syncServerTime.call(this).then(() => {
          // Mark the process as finished
          if (resyncTimeout === timeout) resyncTimeout = null
          // And then restart the listener
          resync()
        }).catch(e => {
          // If there was an error, log it and possibly attempt again
          if (resyncTimeout === timeout) {
            // In this case, it was the current task that failed
            resyncTimeout = null
            console.error('Error re-syncing server time; will re-attempt in 5s', e)
            // Call resync again, with a shorter delay
            setTimeout(() => resync(0), 5000)
          } else {
            // If there is already another attempt, just log it
            console.error('Error re-syncing server time; another attempt is in progress', e)
          }
        })
      }, delay)
      resyncTimeout = timeout
    }

    let wallLast = Date.now()
    let monotonicLast = performance.now()

    // Watchdog to ensure our time doesn't drift. Periodically check for
    // differences between the elapsed wall time and the elapsed monotonic
    // time
    watchdog = setInterval(() => {
      const wallNow = Date.now()
      const monotonicNow = performance.now()
      const difference = Math.abs(Math.abs((wallNow - wallLast)) - Math.abs((monotonicNow - monotonicLast)))
      // Tolerate up to a 10ms difference
      if (difference > 10) {
        if (resyncTimeout != null) clearTimeout(resyncTimeout)
        resyncTimeout = null
        resync(0)
      }
      wallLast = wallNow
      monotonicLast = monotonicNow
    }, 10000)

    // Start the sync process
    resyncTimeout = null
    resync(0)
  },
  'chelonia/private/stopClockSync': () => {
    if (resyncTimeout !== undefined) {
      if (watchdog != null) clearInterval(watchdog)
      if (resyncTimeout != null) clearTimeout(resyncTimeout)
      watchdog = undefined
      resyncTimeout = undefined
    }
  },
  // Get an estimate of the server's current time based on the time elapsed as
  // measured locally (using a monotonic clock), which is used as an offset, and
  // a previously retrieved server time. The time value is returned as a UNIX
  // _millisecond_ timestamp (milliseconds since 1 Jan 1970 00:00:00 UTC)
  'chelonia/time': function (): number {
    const monotonicNow = performance.now()
    const wallNow = wallBase - monotonicBase + monotonicNow
    return Math.round(wallNow)
  }
}): string[])
