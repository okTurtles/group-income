/* eslint-env mocha */
import assert from 'node:assert/strict'
import { createNamespaceCacheList, NS_CACHE_OUTBOX } from './namespaceCacheList.js'

const ID = 'identity-own'

const harness = ({ local = {}, server = null, answers = {}, deleted = [], failing = [] } = {}) => {
  const state = { namespaceLookups: { ...local } }
  const calls = { resolve: [], lookup: [], isDeleted: [], writes: [], errors: [] }
  // Fake KV server enforcing version tags like the real backend does. A
  // cleared value (`cleared`) has a version tag but no list.
  const kv = { names: server ? [...server] : null, version: server ? 1 : 0, cleared: false }
  const etagOf = () => kv.names || kv.cleared ? `"v${kv.version}"` : '""'
  let chain = Promise.resolve()
  const list = createNamespaceCacheList({
    getState: () => state,
    getConfig: () => ({
      reactiveSet: (o, k, v) => { o[k] = v },
      reactiveDel: (o, k) => { delete o[k] }
    }),
    resolve: (name) => {
      calls.resolve.push(name)
      if (failing.includes(name)) return Promise.reject(new Error('503: Service Unavailable'))
      return Promise.resolve(answers[name] ?? null)
    },
    lookup: (name) => {
      calls.lookup.push(name)
      state.namespaceLookups[name] = answers[name]
      return Promise.resolve(answers[name])
    },
    isDeletedAccount: (contractID) => {
      calls.isDeleted.push(contractID)
      return Promise.resolve(deleted.includes(contractID))
    },
    queue: (_, fn) => {
      const run = chain.then(fn)
      chain = run.catch(() => {})
      return run
    },
    write: async (_, data, { ifMatch, onconflict }) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        calls.writes.push({ data: [...data], ifMatch })
        if ((ifMatch || '""') === etagOf()) {
          kv.names = [...data]
          kv.cleared = false
          kv.version++
          return { etag: etagOf() }
        }
        const currentData = kv.names ? [...kv.names] : kv.cleared ? null : undefined
        const result = await onconflict({ currentData, etag: etagOf() })
        if (!result) return { etag: null }
        ;[data, ifMatch] = result
      }
      throw new Error('max attempts')
    },
    onError: (name, e) => calls.errors.push(name)
  })
  // What the slot's `onUpdate` records after a load
  const load = () => list.recordServerState(ID, kv.names || [], kv.names || kv.cleared ? etagOf() : null)
  return { list, state, calls, kv, load, outbox: () => state[NS_CACHE_OUTBOX] }
}

describe('namespace-cache list', () => {
  it('only looks up names that are on the server list and unknown locally', async () => {
    const t = harness({
      local: { alice: 'id-a' },
      answers: { bob: 'id-b', ghost: null, dora: 'id-d', flaky: 'id-f' },
      deleted: ['id-d'],
      failing: ['flaky']
    })
    await t.list.verifyUnknownNames(['alice', 'bob', 'ghost', 'dora', 'flaky'])
    assert.deepEqual(t.calls.resolve.sort(), ['bob', 'dora', 'flaky', 'ghost'])
    // Only live accounts are written into the local cache
    assert.deepEqual(t.calls.lookup, ['bob'])
    assert.equal(t.state.namespaceLookups.dora, undefined)
    assert.deepEqual(t.calls.isDeleted.sort(), ['id-b', 'id-d'])
    assert.equal(t.outbox().drop.ghost, 'unregistered')
    assert.equal(t.outbox().drop.dora, 'deleted')
    // A failed lookup keeps the name (it is retried on the next load)
    assert.equal(t.outbox().drop.flaky, undefined)
    assert.deepEqual(t.calls.errors, ['flaky'])
  })

  it('does not write before the list has been loaded, or when nothing changed', async () => {
    const t = harness({ server: ['alice'], local: { alice: 'id-a' } })
    t.list.markAdded('alice')
    assert.equal(await t.list.save(ID), false)
    t.load()
    await t.list.save(ID)
    assert.equal(t.calls.writes.length, 0)
  })

  it('writes outbox additions with the known version tag', async () => {
    const t = harness({ server: ['alice'], local: { alice: 'id-a' } })
    t.load()
    t.state.namespaceLookups.bob = 'id-b'
    t.list.markAdded('bob')
    await t.list.save(ID)
    assert.deepEqual(t.calls.writes, [{ data: ['alice', 'bob'], ifMatch: '"v1"' }])
    assert.deepEqual(t.kv.names, ['alice', 'bob'])
    assert.equal(t.outbox().add.bob, undefined)
    // The new version tag is remembered
    t.list.markAdded('carol')
    await t.list.save(ID)
    assert.deepEqual(t.calls.writes[1], { data: ['alice', 'bob', 'carol'], ifMatch: '"v2"' })
  })

  it('does not re-add names another device removed', async () => {
    const t = harness({ server: ['alice'], local: { alice: 'id-a', removed: 'id-r' } })
    // Everything this device knew was saved before; another device then
    // removed 'removed' from the list
    t.state[NS_CACHE_OUTBOX] = { add: {}, drop: {} }
    t.load()
    t.list.markAdded('bob')
    await t.list.save(ID)
    assert.deepEqual(t.kv.names, ['alice', 'bob'])
  })

  it('resolves conflicts by merging the outbox into the server copy, without lookups', async () => {
    const t = harness({ server: ['alice'], local: { alice: 'id-a' } })
    t.load()
    // Another device writes in the meantime
    t.kv.names = ['alice', 'zed']
    t.kv.version++
    t.list.markAdded('bob')
    await t.list.save(ID)
    assert.deepEqual(t.kv.names, ['alice', 'bob', 'zed'])
    assert.equal(t.calls.resolve.length + t.calls.lookup.length, 0)
    assert.deepEqual(t.calls.writes.map(w => w.ifMatch), ['"v1"', '"v2"'])
  })

  it('a conflict that leaves nothing to write records the server copy', async () => {
    const t = harness({ server: ['alice'], local: { alice: 'id-a' } })
    t.load()
    t.kv.names = ['alice', 'bob']
    t.kv.version++
    t.list.markAdded('bob')
    await t.list.save(ID)
    assert.equal(t.calls.writes.length, 1)
    assert.equal(t.outbox().add.bob, undefined)
    // Next save uses the server's version tag and has nothing to write
    t.list.markAdded('carol')
    await t.list.save(ID)
    assert.deepEqual(t.calls.writes[1], { data: ['alice', 'bob', 'carol'], ifMatch: '"v2"' })
  })

  it('creates a missing list from every name this device knows', async () => {
    const t = harness({ local: { alice: 'id-a', bob: 'id-b' } })
    await t.list.createMissingList(ID)
    assert.deepEqual(t.calls.writes, [{ data: ['alice', 'bob'], ifMatch: undefined }])
    assert.deepEqual(t.kv.names, ['alice', 'bob'])
  })

  it('does not create an empty list', async () => {
    const t = harness()
    await t.list.createMissingList(ID)
    assert.equal(t.calls.writes.length, 0)
  })

  it('recreating a list that was cleared on the server sends its version tag', async () => {
    const t = harness({ server: ['alice'], local: { alice: 'id-a', bob: 'id-b' } })
    // Another device clears the list
    t.kv.names = null
    t.kv.cleared = true
    t.kv.version++
    t.load()
    await t.list.createMissingList(ID)
    assert.deepEqual(t.calls.writes, [{ data: ['alice', 'bob'], ifMatch: '"v2"' }])
    assert.deepEqual(t.kv.names, ['alice', 'bob'])
  })

  it('seeds the outbox with every known name on first use', () => {
    const t = harness({ local: { alice: 'id-a', bob: 'id-b' } })
    t.list.markAdded('carol')
    assert.deepEqual(Object.keys(t.outbox().add).sort(), ['alice', 'bob', 'carol'])
  })

  it('deleted accounts are removed from the list, kept locally and never re-added', async () => {
    const t = harness({ server: ['alice', 'dora'], local: { alice: 'id-a', dora: 'id-d' } })
    t.state[NS_CACHE_OUTBOX] = { add: {}, drop: {} }
    t.load()
    assert.deepEqual(t.list.markDeletedAccount('id-d'), ['dora'])
    assert.equal(t.state.namespaceLookups.dora, 'id-d')
    await t.list.save(ID)
    assert.deepEqual(t.kv.names, ['alice'])
    // 'deleted' drops survive settling, so a re-added name is removed again
    t.list.markAdded('dora')
    t.kv.names = ['alice', 'dora']
    t.kv.version++
    t.list.markAdded('bob')
    await t.list.save(ID)
    assert.deepEqual(t.kv.names, ['alice', 'bob'])
    assert.equal(t.outbox().drop.dora, 'deleted')
  })

  it('settles "unregistered" drops once the server list no longer has them', async () => {
    const t = harness({ server: ['alice', 'ghost'], local: { alice: 'id-a' }, answers: { ghost: null } })
    t.load()
    await t.list.verifyUnknownNames(['alice', 'ghost'])
    await t.list.save(ID)
    assert.deepEqual(t.kv.names, ['alice'])
    assert.equal(t.outbox().drop.ghost, undefined)
  })

  it('work started before a reset does not change the new session', async () => {
    const t = harness({ server: ['alice'], answers: { bob: 'id-b' } })
    t.load()
    const verifying = t.list.verifyUnknownNames(['bob'])
    t.list.reset()
    await verifying
    assert.equal(t.state.namespaceLookups.bob, undefined)
    assert.equal(await t.list.save(ID), false)
  })
})
