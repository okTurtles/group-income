/* eslint-env mocha */
import assert from 'node:assert/strict'
import { applyNamespaceUpdate, ownValue } from './namespaceCache.js'

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k)
const setters = {
  set: (o, k, v) => { o[k] = v },
  del: (o, k) => { delete o[k] }
}
const apply = (state, update) => applyNamespaceUpdate(state, update, setters)
const plain = (state) => ({
  names: { ...state.namespaceLookups },
  ids: { ...state.reverseNamespaceLookups }
})

describe('namespace cache', () => {
  describe('ownValue', () => {
    it('ignores inherited properties', () => {
      assert.equal(ownValue({}, 'constructor'), undefined)
      assert.equal(ownValue({ constructor: 'id-c' }, 'constructor'), 'id-c')
      assert.equal(ownValue(Object.create(null), 'constructor'), undefined)
      assert.equal(ownValue(undefined, 'alice'), undefined)
      assert.equal(ownValue(null, 'alice'), undefined)
    })
  })

  describe('applyNamespaceUpdate', () => {
    it('creates missing caches', () => {
      const state = {}
      assert.equal(apply(state, { name: 'alice', value: 'id-a' }), true)
      assert.equal(Object.getPrototypeOf(state.namespaceLookups), null)
      assert.equal(Object.getPrototypeOf(state.reverseNamespaceLookups), null)
      assert.deepEqual(plain(state), { names: { alice: 'id-a' }, ids: { 'id-a': 'alice' } })
    })

    it('reports unchanged updates', () => {
      const state = {}
      apply(state, { name: 'alice', value: 'id-a' })
      assert.equal(apply(state, { name: 'alice', value: 'id-a' }), false)
      assert.equal(apply(state, { name: 'bob', deletedValue: 'id-b' }), false)
    })

    it('restores a missing reverse entry', () => {
      const state = { namespaceLookups: { alice: 'id-a' }, reverseNamespaceLookups: {} }
      assert.equal(apply(state, { name: 'alice', value: 'id-a' }), true)
      assert.deepEqual(plain(state).ids, { 'id-a': 'alice' })
    })

    it('removes the old reverse entry when a name belongs to a new contract', () => {
      const state = {}
      apply(state, { name: 'bob', value: 'id-1' })
      apply(state, { name: 'bob', value: 'id-2' })
      assert.deepEqual(plain(state), { names: { bob: 'id-2' }, ids: { 'id-2': 'bob' } })
    })

    it('keeps reverse entries that point to another name', () => {
      const state = { namespaceLookups: { bob: 'id-1' }, reverseNamespaceLookups: { 'id-1': 'robert' } }
      apply(state, { name: 'bob', value: 'id-2' })
      assert.deepEqual(plain(state).ids, { 'id-1': 'robert', 'id-2': 'bob' })
      apply(state, { name: 'bob', deletedValue: 'id-1' })
      assert.deepEqual(plain(state), { names: {}, ids: { 'id-1': 'robert' } })
    })

    it('removes names that are no longer registered', () => {
      const state = {}
      apply(state, { name: 'alice', value: 'id-a' })
      apply(state, { name: 'bob', value: 'id-b' })
      assert.equal(apply(state, { name: 'alice', deletedValue: 'id-a' }), true)
      assert.deepEqual(plain(state), { names: { bob: 'id-b' }, ids: { 'id-b': 'bob' } })
    })

    it('cleans up both the broadcast and the local value on removal', () => {
      // A tab that missed the update from 'id-1' to 'id-2'
      const state = {}
      apply(state, { name: 'bob', value: 'id-1' })
      apply(state, { name: 'bob', deletedValue: 'id-2' })
      assert.deepEqual(plain(state), { names: {}, ids: {} })
    })

    it('treats an empty answer as "not registered"', () => {
      const state = {}
      apply(state, { name: 'alice', value: 'id-a' })
      assert.equal(apply(state, { name: 'alice', value: '' }), true)
      assert.deepEqual(plain(state), { names: {}, ids: {} })
    })

    it('handles names that are `Object.prototype` properties after a restore', () => {
      const state = structuredClone({ namespaceLookups: Object.create(null), reverseNamespaceLookups: Object.create(null) })
      assert.equal(Object.getPrototypeOf(state.namespaceLookups), Object.prototype)
      assert.equal(apply(state, { name: 'constructor', deletedValue: undefined }), false)
      assert.equal(apply(state, { name: 'constructor', value: 'id-c' }), true)
      assert.equal(ownValue(state.namespaceLookups, 'constructor'), 'id-c')
      assert.equal(apply(state, { name: 'constructor', value: 'id-c' }), false)
      assert.equal(apply(state, { name: 'constructor', deletedValue: 'id-c' }), true)
      assert.equal(has(state.namespaceLookups, 'constructor'), false)
      assert.deepEqual(plain(state), { names: {}, ids: {} })
    })

    it('keeps a tab in sync with the service worker, even if it misses broadcasts', () => {
      // The service worker writes every answer and broadcasts the changes; a
      // tab applies the broadcasts it gets, and applies the answers to its
      // own lookups (see `controller/namespace.js`).
      let seed = 42
      const random = (n) => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        return seed % n
      }
      const names = ['a', 'b', 'c', 'constructor']
      const values = [null, '', 'id-1', 'id-2', 'id-3']
      for (let run = 0; run < 50; run++) {
        const sw = structuredClone({ namespaceLookups: {}, reverseNamespaceLookups: {} })
        const tab = {}
        for (let step = 0; step < 40; step++) {
          const name = names[random(names.length)]
          const value = values[random(values.length)]
          // Service worker (`project` in sw-namespace.js)
          const update = value ? { name, value } : { name, deletedValue: ownValue(sw.namespaceLookups, name) }
          const changed = apply(sw, update)
          // Broadcast, sometimes missed
          if (changed && random(4) !== 0) apply(tab, update)
          // The tab's own lookup
          apply(tab, value ? { name, value } : { name, deletedValue: ownValue(tab.namespaceLookups, name) })
          assert.deepEqual(plain(tab), plain(sw), `run ${run}, step ${step}`)
        }
      }
    })
  })
})
