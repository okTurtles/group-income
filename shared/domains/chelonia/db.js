'use strict'

import sbp from '@sbp/sbp'
import '@sbp/okturtles.data'
import '@sbp/okturtles.eventqueue'
import { SPMessage } from '~/shared/domains/chelonia/SPMessage.js'
import { ChelErrorDBBadPreviousHEAD, ChelErrorDBConnection } from './errors.js'

const headPrefix = 'head='

const getContractIdFromLogHead = (key: string): ?string => {
  if (!key.startsWith(headPrefix)) return undefined
  return key.slice(headPrefix.length)
}
const getLogHead = (contractID: string): string => `${headPrefix}${contractID}`

type HEADInfo = { HEAD: string; height: number; previousKeyOp: ?string; }

export const checkKey = (key: string): void => {
  // Disallow unprintable characters, slashes, and TAB.
  // Also disallow characters not allowed by Windows:
  // <https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file>
  if (/[\x00-\x1f\x7f\t\\/<>:"|?*]/.test(key)) { // eslint-disable-line no-control-regex
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
  'any:': value => value
  /*
  // 2025-03-24: Commented out because it's not used; currently, only `any:`
  // is used in the `/file` route.
  // Throw if the value if not a buffer.
  'blob:': value => {
    if (Buffer.isBuffer(value)) {
      return value
    }
    throw new ChelErrorDBConnection('Unexpected value: expected a buffer.')
  }
  */
}

// NOTE: To enable persistence of log use 'sbp/selectors/overwrite'
//       to overwrite the following selectors:
sbp('sbp/selectors/unsafe', ['chelonia.db/get', 'chelonia.db/set', 'chelonia.db/delete'])
// NOTE: MAKE SURE TO CALL 'sbp/selectors/lock' after overwriting them!

// When using a lightweight client, the client doesn't keep a copy of messages
// in the DB. Therefore, `chelonia.db/*` selectors are mostly turned into no-ops.
// The `chelonia.db/get` selector is slightly more complex than a no-op, because
// Chelonia relies on being able to find the current contract head. To overcome
// this, if a head is requested, 'chelonia.db/get' returns information from
// the Chelonia contract state.
const dbPrimitiveSelectors = process.env.LIGHTWEIGHT_CLIENT === 'true'
  ? {
      'chelonia.db/get': function (key: string): Promise<HEADInfo | Buffer | string | void> {
        const id = getContractIdFromLogHead(key)
        if (!id) return Promise.resolve()
        const state = sbp('chelonia/rootState').contracts[id]
        const value = (state?.HEAD
          ? JSON.stringify({
            HEAD: state.HEAD,
            height: state.height,
            previousKeyOp: state.previousKeyOp
          })
          : undefined)
        return Promise.resolve(value)
      },
      'chelonia.db/set': function (): Promise<Error | void> {
        return Promise.resolve()
      },
      'chelonia.db/delete': function (): Promise<boolean> { return Promise.resolve(true) }
    }
  : {
      // eslint-disable-next-line require-await
      'chelonia.db/get': async function (prefixableKey: string): Promise<HEADInfo | Buffer | Error | string | void> {
        const [prefix, key] = parsePrefixableKey(prefixableKey)
        const value = sbp('okTurtles.data/get', key)
        if (value === undefined) {
          return
        }
        return prefixHandlers[prefix](value)
      },
      // eslint-disable-next-line require-await
      'chelonia.db/set': async function (key: string, value: Buffer | string): Promise<Error | void> {
        checkKey(key)
        return sbp('okTurtles.data/set', key, value)
      },
      // eslint-disable-next-line require-await
      'chelonia.db/delete': async function (key: string): Promise<boolean> {
        return sbp('okTurtles.data/delete', key)
      }
    }

export default ((sbp('sbp/selectors/register', {
  ...dbPrimitiveSelectors,
  'chelonia/db/getEntryMeta': async (contractID: string, height: number) => {
    const entryMetaJson = await sbp('chelonia.db/get', `_private_hidx=${contractID}#${height}`)
    if (!entryMetaJson) return

    return JSON.parse(entryMetaJson)
  },
  'chelonia/db/setEntryMeta': async (contractID: string, height: number, entryMeta: Object) => {
    const entryMetaJson = JSON.stringify(entryMeta)
    await sbp('chelonia.db/set', `_private_hidx=${contractID}#${height}`, entryMetaJson)
  },
  'chelonia/db/latestHEADinfo': async (contractID: string): Promise<HEADInfo | void> => {
    const r = await sbp('chelonia.db/get', getLogHead(contractID))
    return r && JSON.parse(r)
  },
  'chelonia/db/deleteLatestHEADinfo': (contractID: string): Promise<void> => {
    return sbp('chelonia.db/set', getLogHead(contractID), '')
  },
  'chelonia/db/getEntry': async function (hash: string): Promise<SPMessage> {
    try {
      const value: string = await sbp('chelonia.db/get', hash)
      if (!value) throw new Error(`no entry for ${hash}!`)
      return SPMessage.deserialize(value, this.transientSecretKeys, undefined, this.config.unwrapMaybeEncryptedData)
    } catch (e) {
      throw new ChelErrorDBConnection(`${e.name} during getEntry: ${e.message}`)
    }
  },
  'chelonia/db/addEntry': function (entry: SPMessage): Promise<string> {
    // because addEntry contains multiple awaits - we want to make sure it gets executed
    // "atomically" to minimize the chance of a contract fork
    return sbp('okTurtles.eventQueue/queueEvent', `chelonia/db/${entry.contractID()}`, [
      'chelonia/private/db/addEntry', entry
    ])
  },
  // NEVER call this directly yourself! _always_ call 'chelonia/db/addEntry' instead
  'chelonia/private/db/addEntry': async function (entry: SPMessage): Promise<string> {
    try {
      const { previousHEAD: entryPreviousHEAD, previousKeyOp: entryPreviousKeyOp, height: entryHeight } = entry.head()
      const contractID: string = entry.contractID()
      if (await sbp('chelonia.db/get', entry.hash())) {
        console.warn(`[chelonia.db] entry exists: ${entry.hash()}`)
        return entry.hash()
      }
      const HEADinfo = await sbp('chelonia/db/latestHEADinfo', contractID)
      if (!entry.isFirstMessage()) {
        if (!HEADinfo) {
          throw new Error(`No latest HEAD for ${contractID} when attempting to process entry with previous HEAD ${entryPreviousHEAD} at height ${entryHeight}`)
        }
        const { HEAD: contractHEAD, previousKeyOp: contractPreviousKeyOp, height: contractHeight } = HEADinfo
        if (entryPreviousHEAD !== contractHEAD) {
          console.warn(`[chelonia.db] bad previousHEAD: ${entryPreviousHEAD}! Expected: ${contractHEAD} for contractID: ${contractID}`)
          throw new ChelErrorDBBadPreviousHEAD(`bad previousHEAD: ${entryPreviousHEAD}. Expected ${contractHEAD} for contractID: ${contractID}`)
        } else if (entryPreviousKeyOp !== contractPreviousKeyOp) {
          console.error(`[chelonia.db] bad previousKeyOp: ${entryPreviousKeyOp}! Expected: ${contractPreviousKeyOp} for contractID: ${contractID}`)
          throw new ChelErrorDBBadPreviousHEAD(`bad previousKeyOp: ${entryPreviousKeyOp}. Expected ${contractPreviousKeyOp} for contractID: ${contractID}`)
        } else if (!Number.isSafeInteger(entryHeight) || entryHeight !== (contractHeight + 1)) {
          console.error(`[chelonia.db] bad height: ${entryHeight}! Expected: ${contractHeight + 1} for contractID: ${contractID}`)
          throw new ChelErrorDBBadPreviousHEAD(`[chelonia.db] bad height: ${entryHeight}! Expected: ${contractHeight + 1} for contractID: ${contractID}`)
        }
      } else {
        if (HEADinfo) {
          console.error(`[chelonia.db] bad previousHEAD: ${entryPreviousHEAD}! Expected: <null> for contractID: ${contractID}`)
          throw new ChelErrorDBBadPreviousHEAD(`bad previousHEAD: ${entryPreviousHEAD}. Expected <null> for contractID: ${contractID}`)
        } else if (entryHeight !== 0) {
          console.error(`[chelonia.db] bad height: ${entryHeight}! Expected: 0 for contractID: ${contractID}`)
          throw new ChelErrorDBBadPreviousHEAD(`[chelonia.db] bad height: ${entryHeight}! Expected: 0 for contractID: ${contractID}`)
        }
      }
      await sbp('chelonia.db/set', entry.hash(), entry.serialize())
      await sbp('chelonia.db/set', getLogHead(contractID), JSON.stringify({
        HEAD: entry.hash(),
        previousKeyOp: entry.isKeyOp() ? entry.hash() : entry.previousKeyOp(),
        height: entry.height()
      }))
      console.debug(`[chelonia.db] HEAD for ${contractID} updated to:`, entry.hash())
      await sbp('chelonia/db/setEntryMeta', contractID, entryHeight, {
        // The hash is used for reverse lookups (height to CID)
        hash: entry.hash(),
        // The date isn't currently used, but will be used for filtering messages
        date: new Date().toISOString(),
        // isKeyOp is used for filtering messages (the actual filtering is
        // done more efficiently a separate index key, but `isKeyOp` allows
        // us to bootstrap this process without having to load the full message)
        // The separate index key bears the prefix `_private_keyop_idx_`.
        ...(entry.isKeyOp() && { isKeyOp: true })
      })
      return entry.hash()
    } catch (e) {
      if (e.name.includes('ErrorDB')) {
        throw e // throw the specific type of ErrorDB instance
      }
      throw new ChelErrorDBConnection(`${e.name} during addEntry: ${e.message}`)
    }
  },
  'chelonia/db/lastEntry': async function (contractID: string): Promise<SPMessage> {
    try {
      const latestHEADinfo = await sbp('chelonia/db/latestHEADinfo', contractID)
      if (!latestHEADinfo) throw new Error(`contract ${contractID} has no latest hash!`)
      return sbp('chelonia/db/getEntry', latestHEADinfo.HEAD)
    } catch (e) {
      throw new ChelErrorDBConnection(`${e.name} during lastEntry: ${e.message}`)
    }
  }
}): any): string[])
