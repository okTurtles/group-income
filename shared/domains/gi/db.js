'use strict'

import sbp from '~/shared/sbp.js'
import '~/shared/domains/okTurtles/data.js'
import { GIMessage } from '~/shared/GIMessage.js'

// NOTE: To enable persistence of log use 'sbp/selectors/overwrite'
//       to overwrite the following selectors:
//       - 'gi.db/get'
//       - 'gi.db/set'

export class ErrorDBBadPreviousHEAD extends Error {
  // ugly boilerplate because JavaScript is stupid
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
  constructor (...params: any[]) {
    super(...params)
    this.name = this.constructor.name
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}
export class ErrorDBConnection extends Error {
  constructor (...params: any[]) {
    super(...params)
    this.name = this.constructor.name
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export default (sbp('sbp/selectors/register', {
  'gi.db/get': function (key: string): Promise<*> {
    return Promise.resolve(sbp('okTurtles.data/get', key))
  },
  'gi.db/set': function (key: string, value: string): Promise<void> {
    return Promise.resolve(sbp('okTurtles.data/set', key, value))
  },
  'gi.db/log/logHEAD': function (contractID: string): string {
    return `${contractID}-HEAD`
  },
  'gi.db/log/getEntry': async function (hash: string): Promise<GIMessage> {
    try {
      const value: string = await sbp('gi.db/get', hash)
      if (!value) throw new Error(`no entry for ${hash}!`)
      return GIMessage.deserialize(value)
    } catch (e) {
      throw new ErrorDBConnection(`${e.name} during getEntry: ${e.message}`)
    }
  },
  'gi.db/log/addEntry': async function (entry: GIMessage): Promise<string> {
    try {
      const { previousHEAD } = entry.message()
      const contractID: string = entry.contractID()
      if (await sbp('gi.db/get', entry.hash())) {
        console.warn(`[addLogEntry] entry exists: ${entry.hash()}`)
        return entry.hash()
      }
      const HEAD = await sbp('gi.db/get', sbp('gi.db/log/logHEAD', contractID))
      if (!entry.isFirstMessage() && previousHEAD !== HEAD) {
        console.error(`[addLogEntry] bad previousHEAD: ${previousHEAD}! Expected: ${HEAD} for contractID: ${contractID}`)
        throw new ErrorDBBadPreviousHEAD(`bad previousHEAD: ${previousHEAD}`)
      }
      await sbp('gi.db/set', sbp('gi.db/log/logHEAD', contractID), entry.hash())
      console.debug(`[addLogEntry] HEAD for ${contractID} updated to:`, entry.hash())
      await sbp('gi.db/set', entry.hash(), entry.serialize())
      return entry.hash()
    } catch (e) {
      if (e.name.indexOf('ErrorDB') === 0) {
        throw e // throw the specific type of ErrorDB instance
      }
      // TODO: save e.name as a property of ErrorDBConnection
      //       so that we can handle QuotaExceededError
      throw new ErrorDBConnection(`${e.name} during addEntry: ${e.message}`)
    }
  },
  'gi.db/log/lastEntry': async function (contractID: string): Promise<GIMessage> {
    try {
      const hash = await sbp('gi.db/get', sbp('gi.db/log/logHEAD', contractID))
      if (!hash) throw new Error(`contract ${contractID} has no latest hash!`)
      return sbp('gi.db/log/getEntry', hash)
    } catch (e) {
      throw new ErrorDBConnection(`${e.name} during lastEntry: ${e.message}`)
    }
  }
}): any)
