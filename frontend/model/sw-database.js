'use strict'

// Database selectors file
// For lightweight clients, most keys except `_private_` keys and
// contract state are discarded.
// For non-lightweight clients, all keys are saved. But, `_private_` keys are
// saved in Chelonia state (instead of regular storage in the `Contracts` DB),
// since they are user-specific.
// We currently use `_private_` for persistent actions.

import sbp from '@sbp/sbp'
import localforage from './localforage.js'

if (process.env.LIGHTWEIGHT_CLIENT !== 'true') {
  const log = localforage.createInstance({
    name: 'Group Income',
    storeName: 'Contracts'
  })
  // use localforage for storage
  sbp('sbp/selectors/overwrite', {
    'chelonia.db/get': key => {
      // Do not discard `_private_` keys (internal Chlonia metadata)
      // Save them in Chelonia state
      if (key.startsWith('_private')) {
        const rootState = sbp('chelonia/rootState')
        return Promise.resolve(rootState[key])
      }
      return log.getItem(key)
    },
    // TODO: handle QuotaExceededError
    'chelonia.db/set': (key, value) => {
      // Do not discard `_private_` keys (internal Chlonia metadata)
      if (key.startsWith('_private')) {
        const rootState = sbp('chelonia/rootState')
        rootState[key] = value
        // Note: Lightweight clients intentionally don't persist contract HEADs
        return Promise.resolve()
      }
      return log.setItem(key, value)
    },
    'chelonia.db/delete': (key: string) => {
      // Do not discard `_private_` keys (internal Chlonia metadata)
      if (key.startsWith('_private')) {
        const rootState = sbp('chelonia/rootState')
        delete rootState[key]
        return Promise.resolve(true)
      }
      return log.removeItem(key)
    }
  })
  sbp('sbp/selectors/lock', ['chelonia.db/get', 'chelonia.db/set', 'chelonia.db/delete'])
} else {
  sbp('sbp/selectors/overwrite', {
    'chelonia.db/get': function (key: string): Promise<string | void> {
      if (key.startsWith('_private')) {
        const rootState = sbp('chelonia/rootState')
        return Promise.resolve(rootState[key])
      }
      const id = key.startsWith('head=') && key.slice(5)
      if (!id) return Promise.resolve()
      const state = sbp('chelonia/rootState').contracts[id]
      const value = state?.HEAD
        ? JSON.stringify({
          HEAD: state.HEAD,
          height: state.height,
          previousKeyOp: state.previousKeyOp
        })
        : undefined
      return Promise.resolve(value)
    },
    'chelonia.db/set': function (key: string, value: string): Promise<void> {
      if (key.startsWith('_private')) {
        const rootState = sbp('chelonia/rootState')
        rootState[key] = value
      }
      return Promise.resolve()
    },
    'chelonia.db/delete': function (key: string): Promise<true> {
      if (key.startsWith('_private')) {
        const rootState = sbp('chelonia/rootState')
        delete rootState[key]
      }
      return Promise.resolve(true)
    },
    'chelonia.db/iterKeys': async function * (): AsyncIterator<string> {
      // empty
    },
    'chelonia.db/keyCount': function (): Promise<number> {
      return Promise.resolve(0)
    }
  })
  sbp('sbp/selectors/lock', ['chelonia.db/get', 'chelonia.db/set', 'chelonia.db/delete', 'chelonia.db/iterKeys', 'chelonia.db/keyCount'])
}
