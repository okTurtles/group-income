import sbp from '@sbp/sbp'
import { CAPTURED_LOGS } from '~/frontend/utils/events.js'
import CircularList from '~/frontend/utils/CircularList.js'

const loggingLevels = ['debug', 'error', 'info', 'log', 'warn']
const originalConsole = console
const noop = (...args: any) => undefined

export async function createLogger (config: Object, { getItem, removeItem, setItem }: { getItem: Function, removeItem: Function, setItem: Function }): Object {
  const entries = new CircularList(config.maxEntries)
  const methods = Object.fromEntries(loggingLevels.map((name) =>
    [name, (...args) => {
      originalConsole[name](...args)
      captureLogEntry(logger, name, config.source, ...args)
    }]
  ))
  const appLogsFilter: string[] = []
  // Make a copy of 'methods' to prevent reassignment by 'setAppLogsFilter'
  const consoleProxy = new Proxy({ ...methods }, {
    get (o, p, r) {
      return Reflect.has(o, p) ? Reflect.get(o, p, r) : Reflect.get(originalConsole, p, r)
    },
    has (o, p) {
      return Reflect.has(originalConsole, p)
    }
  })
  const logger = {
    get appLogsFilter () {
      return [...appLogsFilter]
    },
    console: consoleProxy,
    entries,
    async clear () {
      await removeItem('entries')
      entries.clear()
    },
    async save () {
      try {
        await setItem('entries', this.entries.toArray())
      } catch (error) {
        consoleProxy.error(error)
      }
    },
    setAppLogsFilter (filter: Array<string>) {
      appLogsFilter.splice(0, appLogsFilter.length, ...filter)
      // NOTE: Find a way to capture logs without messing up with log file location.
      // console.log() doesnt include stack trace, so when logged, we can't access
      // where the log came from (file name), which} difficults debugging if needed.
      for (const level of loggingLevels) {
        // $FlowFixMe
        consoleProxy[level] = appLogsFilter.includes(level) ? methods[level] : noop
      }
    }
  }

  // Handle potential data corruption gracefully
  const previousEntries = await (async () => {
    try {
      const stored = await getItem('entries')
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      consoleProxy.error('Failed to parse stored entries:', error)
      return []
    }
  })()

  // If `maxEntries` is changed in a release, this will discard oldest logs as necessary.
  if (config.maxEntries < previousEntries.length) {
    previousEntries.splice(0, previousEntries.length - config.maxEntries)
  }
  // Load the previous entries to sync the in-memory array with the local storage.
  if (previousEntries.length) {
    logger.entries.addAll(previousEntries)
  }

  return logger
}

function captureLogEntry (logger: Object, type: string, source: string, ...args) {
  const entry = {
    timestamp: new Date().toISOString(),
    source,
    type,
    // Detect when arg is an Error and capture it properly.
    // ex: uncaught Vue errors or custom try/catch errors.
    msg: args.map((arg) => {
      try {
        const seen = new WeakSet()
        return JSON.parse(
          JSON.stringify(arg, (_, v) => {
            if (v instanceof Error) {
              return {
                name: v.name,
                message: v.message,
                stack: v.stack
              }
            }
            // Handle circular references
            if (typeof v === 'object' && v !== null) {
              if (seen.has(v)) {
                return '[Circular Reference]'
              }
              seen.add(v)
            }
            return v
          })
        )
      } catch (e) {
        return `[captureLogs failed to stringify argument of type '${typeof arg}'. Err: ${e.message}]`
      }
    })
  }
  logger.entries.add(entry)
  // To avoid infinite loop because we log all selector calls, we run sbp calls
  // here in a roundabout way by getting the function to which they're mapped.
  // The reason this works is because the entire `sbp` domain is blacklisted
  // from being logged in main.js.
  sbp('sbp/selectors/fn', 'okTurtles.events/emit')(CAPTURED_LOGS, entry)
}
