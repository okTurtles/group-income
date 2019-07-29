'use strict'

import sbp from '~/shared/sbp.js'
import '~/shared/domains/okTurtles/data.js'
import { GIMessage } from '~/shared/GIMessage.js'

// NOTE: To enable persistence of log use 'sbp/selectors/overwrite'
//       to overwrite the following selectors:
//       - 'gi.db/log/get'
//       - 'gi.db/log/set'

export default sbp('sbp/selectors/register', {
  'gi.db/log/logHEAD': function (contractID: string): string {
    return `${contractID}-HEAD`
  },
  'gi.db/log/get': function (key: string): Promise {
    return Promise.resolve(sbp('okTurtles.data/get', key))
  },
  'gi.db/log/set': function (key: string, value: string): Promise {
    return Promise.resolve(sbp('okTurtles.data/set', key, value))
  },
  'gi.db/log/getEntry': async function (hash: string): Promise<GIMessage> {
    const value: string = await sbp('gi.db/log/get', hash)
    if (!value) throw new Error(`no entry for ${hash}!`)
    return GIMessage.deserialize(value)
  },
  'gi.db/log/addEntry': async function (entry: GIMessage): Promise<string> {
    const { previousHEAD } = entry.message()
    var contractID: string = previousHEAD ? entry.message().contractID : entry.hash()
    if (await sbp('gi.db/log/get', entry.hash())) {
      console.warn(`[addLogEntry] entry exists: ${entry.hash()}`)
      return entry.hash()
    }
    const HEAD = await sbp('gi.db/log/get', sbp('gi.db/log/logHEAD', contractID))
    if (!entry.isFirstMessage() && previousHEAD !== HEAD) {
      console.error(`[addLogEntry] bad previousHEAD: ${previousHEAD}! Expected: ${HEAD} for contractID: ${contractID}`)
      throw new Error(`bad previousHEAD: ${previousHEAD}`)
    }
    await sbp('gi.db/log/set', sbp('gi.db/log/logHEAD', contractID), entry.hash())
    console.debug(`[addLogEntry] HEAD for ${contractID} updated to:`, entry.hash())
    await sbp('gi.db/log/set', entry.hash(), entry.serialize())
    return entry.hash()
  },
  'gi.db/log/lastEntry': async function (contractID: string): Promise<GIMessage> {
    const hash = await sbp('gi.db/log/get', sbp('gi.db/log/logHEAD', contractID))
    if (!hash) throw new Error(`contract ${contractID} hash no latest hash!`)
    return sbp('gi.db/log/getEntry', hash)
  }
})
