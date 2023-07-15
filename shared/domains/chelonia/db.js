'use strict'

import sbp from '@sbp/sbp'
import '@sbp/okturtles.data'
import '@sbp/okturtles.eventqueue'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import { ChelErrorDBBadPreviousHEAD, ChelErrorDBConnection } from './errors.js'

const headPrefix = 'head='

const getContractIdFromLogHead = (logHead: string): string => {
  if (!isLogHead(logHead)) throw new Error('Not a log head')
  return logHead.slice(headPrefix.length)
}
const getLogHead = (contractID: string): string => `${headPrefix}${contractID}`
const isLogHead = (key: string) => key.startsWith(headPrefix)

export const checkKey = (key: string): void => {
  // Disallow unprintable characters, slashes, and TAB.
  if (/[\x00-\x1f\x7f\t\\/]/.test(key)) { // eslint-disable-line no-control-regex
    throw new Error(`bad key: ${JSON.stringify(key)}`)
  }
}

export const parsePrefixableKey = (key: string): [string, string] => {
  const i = key.indexOf(':')
  if (i === -1) {
    return ['', key]
  }
  const prefix = key.slice(0, i + 1)
  if (prefix in prefixHandlers) {
    return [prefix, key.slice(prefix.length)]
  }
  throw new ChelErrorDBConnection(`Unknown prefix in '${key}'.`)
}

export const prefixHandlers: Object = {
  // Decode buffers, but don't transform other values.
  '': value => Buffer.isBuffer(value) ? value.toString('utf8') : value,
  ':': value => Buffer.isBuffer(value) ? value.toString('utf8') : value,
  'any:': value => value,
  // Throw if the value if not a buffer.
  'blob:': value => {
    if (Buffer.isBuffer(value)) {
      return value
    }
    throw new ChelErrorDBConnection('Unexpected value: expected a buffer.')
  }
}

// NOTE: To enable persistence of log use 'sbp/selectors/overwrite'
//       to overwrite the following selectors:
sbp('sbp/selectors/unsafe', ['chelonia/db/get', 'chelonia/db/set', 'chelonia/db/delete'])
// NOTE: MAKE SURE TO CALL 'sbp/selectors/lock' after overwriting them!

const dbPrimitiveSelectors = process.env.LIGHTWEIGHT_CLIENT === 'true'
  ? {
      'chelonia/db/get': function (key: string): Promise<Buffer | string | void> {
        if (isLogHead(key)) {
          const id = getContractIdFromLogHead(key)
          const value = sbp(this.config.stateSelector).contracts[id]?.HEAD
          return Promise.resolve(value)
        }
        return Promise.resolve()
      },
      'chelonia/db/set': function (key: string, value: Buffer | string): Promise<Error | void> {
        return Promise.resolve()
      },
      'chelonia/db/delete': function (key: string): Promise<boolean> { return Promise.resolve(true) }
    }
  : {
      // eslint-disable-next-line require-await
      'chelonia/db/get': async function (prefixableKey: string): Promise<Buffer | Error | string | void> {
        const [prefix, key] = parsePrefixableKey(prefixableKey)
        const value = sbp('okTurtles.data/get', key)
        if (value === undefined) {
          return
        }
        return prefixHandlers[prefix](value)
      },
      // eslint-disable-next-line require-await
      'chelonia/db/set': async function (key: string, value: Buffer | string): Promise<Error | void> {
        checkKey(key)
        sbp('okTurtles.data/set', key, value)
      },
      // eslint-disable-next-line require-await
      'chelonia/db/delete': async function (key: string): Promise<boolean> {
        return sbp('okTurtles.data/delete', key)
      }
    }

export default (sbp('sbp/selectors/register', {
  ...dbPrimitiveSelectors,
  'chelonia/db/latestHash': function (contractID: string): Promise<string | void> {
    return sbp('chelonia/db/get', getLogHead(contractID))
  },
  'chelonia/db/getEntry': async function (hash: string): Promise<GIMessage> {
    try {
      const value: string = await sbp('chelonia/db/get', hash)
      if (!value) throw new Error(`no entry for ${hash}!`)
      return GIMessage.deserialize(value)
    } catch (e) {
      throw new ChelErrorDBConnection(`${e.name} during getEntry: ${e.message}`)
    }
  },
  'chelonia/db/addEntry': function (entry: GIMessage): Promise<string> {
    // because addEntry contains multiple awaits - we want to make sure it gets executed
    // "atomically" to minimize the chance of a contract fork
    return sbp('okTurtles.eventQueue/queueEvent', `chelonia/db/${entry.contractID()}`, [
      'chelonia/private/db/addEntry', entry
    ])
  },
  // NEVER call this directly yourself! _always_ call 'chelonia/db/addEntry' instead
  'chelonia/private/db/addEntry': async function (entry: GIMessage): Promise<string> {
    try {
      const { previousHEAD } = entry.message()
      const contractID: string = entry.contractID()
      if (await sbp('chelonia/db/get', entry.hash())) {
        console.warn(`[chelonia.db] entry exists: ${entry.hash()}`)
        return entry.hash()
      }
      const HEAD = await sbp('chelonia/db/latestHash', contractID)
      if (!entry.isFirstMessage() && previousHEAD !== HEAD) {
        console.error(`[chelonia.db] bad previousHEAD: ${previousHEAD}! Expected: ${HEAD} for contractID: ${contractID}`)
        throw new ChelErrorDBBadPreviousHEAD(`bad previousHEAD: ${previousHEAD}. Expected ${HEAD} for contractID: ${contractID}`)
      }
      await sbp('chelonia/db/set', entry.hash(), entry.serialize())
      await sbp('chelonia/db/set', getLogHead(contractID), entry.hash())
      console.debug(`[chelonia.db] HEAD for ${contractID} updated to:`, entry.hash())
      return entry.hash()
    } catch (e) {
      if (e.name.includes('ErrorDB')) {
        throw e // throw the specific type of ErrorDB instance
      }
      throw new ChelErrorDBConnection(`${e.name} during addEntry: ${e.message}`)
    }
  },
  'chelonia/db/lastEntry': async function (contractID: string): Promise<GIMessage> {
    try {
      const hash = await sbp('chelonia/db/latestHash', contractID)
      if (!hash) throw new Error(`contract ${contractID} has no latest hash!`)
      return sbp('chelonia/db/getEntry', hash)
    } catch (e) {
      throw new ChelErrorDBConnection(`${e.name} during lastEntry: ${e.message}`)
    }
  }
}): any)
