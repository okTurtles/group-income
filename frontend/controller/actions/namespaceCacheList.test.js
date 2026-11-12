/* eslint-env mocha */
import assert from 'node:assert/strict'
import { createNamespaceCacheList, isContractDeletedError, NS_CACHE_OUTBOX } from './namespaceCacheList.ts'

const ID = 'identity-own'

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k)

const harness = ({ local = {}, server = null, answers = {}, deleted = [], failing = [], deletedFailing = [], batchSize } = {}) => {
  let state = { namespaceLookups: { ...local } }
  const calls = { resolve: [], lookup: [], isDeleted: [], writes: [], errors: [] }
  // Test hooks: `failConflict` is thrown when reading the server's copy on a
  // conflict (e.g., it can't be decrypted); `onResolve` is called on lookups;
  // `onWrite` is called on every write attempt
  const hooks = { failConflict: null, onResolve: null, onWrite: null }
  // Fake KV server enforcing version tags like the real backend does. A
  // cleared value (`cleared`) has a version tag but no list.
  const kv = { names: server ? [...server] : null, version: server ? 1 : 0, cleared: false }
  const etagOf = () => kv.names || kv.cleared ? `"v${kv.version}"` : '""'
  let chain = Promise.resolve()
  const list = createNamespaceCacheList({
    getState: () => state,
    // Same as the service worker's (`setupChelonia.js`)
    getConfig: () => ({
      reactiveSet: (o, k, v) => { if (o[k] !== v) o[k] = v },
      reactiveDel: (o, k) => { if (has(o, k)) delete o[k] }
    }),
    resolve: (name) => {
      calls.resolve.push(name)
      hooks.onResolve?.(name)
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
      if (deletedFailing.includes(contractID)) return Promise.reject(new Error('503: Service Unavailable'))
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
        hooks.onWrite?.()
        if ((ifMatch || '""') === etagOf()) {
          kv.names = [...data]
          kv.cleared = false
          kv.version++
          return { etag: etagOf() }
        }
        const currentData = kv.names ? [...kv.names] : kv.cleared ? null : undefined
        const conflict = { etag: etagOf() }
        Object.defineProperty(conflict, 'currentData', {
          enumerable: true,
          get: () => {
            if (hooks.failConflict) throw hooks.failConflict
            return currentData
          }
        })
        const result = await onconflict(conflict)
        if (!result) return { etag: null }
        ;[data, ifMatch] = result
      }
      throw new Error('max attempts')
    },
    onError: (name, e) => calls.errors.push({ name, message: e.message }),
    ...(batchSize ? { batchSize } : {})
  })
  // What the slot's `onUpdate` records after a load
  const load = () => list.recordServerState(ID, kv.names || [], kv.names || kv.cleared ? etagOf() : null)
  return {
    list,
    get state () { return state },
    calls,
    kv,
    hooks,
    load,
    outbox: () => state[NS_CACHE_OUTBOX],
    // Saving and restoring state (IndexedDB, JSON, `postMessage`) doesn't keep
    // null prototypes
    persist: () => { state = structuredClone(state) },
    // Holds back work queued from now on until the returned function is called
    hold: () => {
      let release
      const gate = new Promise(resolve => { release = resolve })
      chain = chain.then(() => gate)
      return release
    }
  }
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
    assert.deepEqual(t.calls.errors, [{ name: 'flaky', message: '503: Service Unavailable' }])
  })

  it('a name whose account check fails is kept, reported and checked again on the next load', async () => {
    const deletedFailing = ['id-e']
    const t = harness({ answers: { eve: 'id-e' }, deletedFailing })
    await t.list.verifyUnknownNames(['eve'])
    assert.equal(has(t.outbox().drop, 'eve'), false)
    assert.deepEqual(t.calls.lookup, [])
    assert.deepEqual(t.calls.errors, [{ name: 'eve', message: '503: Service Unavailable' }])
    // The server recovers
    deletedFailing.length = 0
    await t.list.verifyUnknownNames(['eve'])
    assert.deepEqual(t.calls.lookup, ['eve'])
    assert.equal(t.state.namespaceLookups.eve, 'id-e')
  })

  it('overlapping verifications look up each unknown name once', async () => {
    const t = harness({ answers: { bob: 'id-b', carol: 'id-c' } })
    await Promise.all([
      t.list.verifyUnknownNames(['bob']),
      t.list.verifyUnknownNames(['bob', 'carol'])
    ])
    assert.deepEqual(t.calls.resolve, ['bob', 'carol'])
    assert.deepEqual(t.calls.isDeleted, ['id-b', 'id-c'])
    assert.deepEqual(t.calls.lookup, ['bob', 'carol'])
  })

  it('a verification started after a reset is not blocked by older ones', async () => {
    const t = harness({ answers: { bob: 'id-b' } })
    const older = t.list.verifyUnknownNames(['bob'])
    t.list.reset()
    await Promise.all([older, t.list.verifyUnknownNames(['bob'])])
    assert.deepEqual(t.calls.resolve, ['bob', 'bob'])
    // Only the newer verification changes state
    assert.deepEqual(t.calls.lookup, ['bob'])
    assert.equal(t.state.namespaceLookups.bob, 'id-b')
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

  it('does not recreate a missing list with names of deleted accounts', async () => {
    const t = harness({ local: { alice: 'id-a', dora: 'id-d' } })
    t.state[NS_CACHE_OUTBOX] = { add: {}, drop: { dora: 'deleted' } }
    await t.list.createMissingList(ID)
    assert.deepEqual(t.kv.names, ['alice'])
  })

  it('creating a missing list does nothing if the session is reset first', async () => {
    const t = harness({ local: { alice: 'id-a', bob: 'id-b' } })
    // The load found no list, but creating it waits behind other queued work
    const release = t.hold()
    const creating = t.list.createMissingList(ID)
    // Meanwhile, the user logs out and in again (the new session's state
    // already has an outbox) and another device creates the list without bob
    t.list.reset()
    t.state[NS_CACHE_OUTBOX] = { add: {}, drop: {} }
    t.kv.names = ['alice']
    t.kv.version++
    release()
    assert.equal(await creating, false)
    assert.equal(t.calls.writes.length, 0)
    assert.deepEqual(t.kv.names, ['alice'])
    assert.deepEqual(Object.keys(t.outbox().add), [])
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

  it('a reset before a write conflict is resolved abandons the write and keeps the edits', async () => {
    const t = harness({ server: ['alice'], local: { alice: 'id-a' } })
    t.state[NS_CACHE_OUTBOX] = { add: {}, drop: {} }
    t.load()
    t.list.markAdded('bob')
    // Another device writes, and the session is reset during the first attempt
    t.kv.names = ['alice', 'zed']
    t.kv.version++
    t.hooks.onWrite = () => t.list.reset()
    assert.equal(await t.list.save(ID), false)
    assert.equal(t.calls.writes.length, 1)
    assert.deepEqual(t.kv.names, ['alice', 'zed'])
    assert.equal(t.outbox().add.bob, true)
  })

  it('a write that completes after a reset does not settle the edits', async () => {
    const t = harness({ server: ['alice'], local: { alice: 'id-a' } })
    t.state[NS_CACHE_OUTBOX] = { add: {}, drop: {} }
    t.load()
    t.list.markAdded('bob')
    t.hooks.onWrite = () => t.list.reset()
    assert.equal(await t.list.save(ID), false)
    assert.deepEqual(t.kv.names, ['alice', 'bob'])
    assert.equal(t.outbox().add.bob, true)
    // The new session settles the edit once it loads the list, without
    // writing again
    t.hooks.onWrite = null
    t.load()
    assert.equal(await t.list.save(ID), true)
    assert.equal(t.calls.writes.length, 1)
    assert.equal(t.outbox().add.bob, undefined)
  })

  it('recreates a list that vanished from the server from every local name, not only the outbox', async () => {
    const t = harness({ server: ['alice'], local: { alice: 'id-a', bob: 'id-b' } })
    // Everything this device knew was already saved
    t.state[NS_CACHE_OUTBOX] = { add: {}, drop: {} }
    t.load()
    // The key is deleted on the server after the load
    t.kv.names = null
    t.kv.version++
    t.list.markAdded('carol')
    await t.list.save(ID)
    assert.deepEqual(t.kv.names, ['alice', 'bob', 'carol'])
  })

  it('a save that fails keeps the edits in the outbox', async () => {
    const t = harness({ server: ['alice'], local: { alice: 'id-a' } })
    t.state[NS_CACHE_OUTBOX] = { add: {}, drop: {} }
    t.load()
    t.list.markAdded('bob')
    // Another device writes, and its copy can't be read
    t.kv.names = ['alice', 'zed']
    t.kv.version++
    t.hooks.failConflict = new Error('Unable to decrypt')
    await assert.rejects(t.list.save(ID), /Unable to decrypt/)
    assert.deepEqual(t.kv.names, ['alice', 'zed'])
    assert.equal(t.outbox().add.bob, true)
    // The next save writes them
    t.hooks.failConflict = null
    await t.list.save(ID)
    assert.deepEqual(t.kv.names, ['alice', 'bob', 'zed'])
    assert.equal(t.outbox().add.bob, undefined)
  })

  it('verifies unknown names in batches', async () => {
    const names = ['a', 'b', 'c', 'd', 'e']
    const answers = Object.fromEntries(names.map(name => [name, `id-${name}`]))
    const t = harness({ answers, batchSize: 2 })
    let pending = 0
    let maxPending = 0
    t.hooks.onResolve = () => {
      maxPending = Math.max(maxPending, ++pending)
      Promise.resolve().then(() => { pending-- })
    }
    await t.list.verifyUnknownNames(names)
    assert.deepEqual(t.calls.lookup.sort(), names)
    assert.equal(maxPending, 2)
  })

  describe('after the state is saved and restored', () => {
    // Restored maps have `Object.prototype` as their prototype, and
    // `constructor` is a valid username

    it('a name on the list that is also an `Object.prototype` property is kept', async () => {
      const t = harness({ server: ['alice', 'constructor'], local: { alice: 'id-a', constructor: 'id-c' } })
      t.load()
      // Creates the outbox, then everything is saved
      await t.list.save(ID)
      t.persist()
      t.load()
      t.list.markAdded('bob')
      await t.list.save(ID)
      assert.deepEqual(t.kv.names, ['alice', 'bob', 'constructor'])
    })

    it('such a name is recorded when learned and written to the list', async () => {
      const t = harness({ server: ['alice'], local: { alice: 'id-a' } })
      t.load()
      await t.list.save(ID)
      t.persist()
      t.load()
      t.state.namespaceLookups.constructor = 'id-c'
      t.list.markAdded('constructor')
      assert.equal(t.outbox().add.constructor, true)
      await t.list.save(ID)
      assert.deepEqual(t.kv.names, ['alice', 'constructor'])
    })

    it('such a name is looked up when this device does not know it', async () => {
      const t = harness({ server: ['alice', 'constructor'], local: { alice: 'id-a' }, answers: { constructor: 'id-c' } })
      t.load()
      await t.list.save(ID)
      t.persist()
      await t.list.verifyUnknownNames(['alice', 'constructor'])
      assert.deepEqual(t.calls.lookup, ['constructor'])
      assert.equal(t.state.namespaceLookups.constructor, 'id-c')
    })

    it('such a name can be dropped and added again', async () => {
      const t = harness({ server: ['alice', 'constructor'], local: { alice: 'id-a', constructor: 'id-c' } })
      t.load()
      await t.list.save(ID)
      t.persist()
      t.list.markDropped('constructor', 'unregistered')
      assert.equal(t.outbox().drop.constructor, 'unregistered')
      t.list.markAdded('constructor')
      assert.equal(Object.prototype.hasOwnProperty.call(t.outbox().drop, 'constructor'), false)
      assert.equal(t.outbox().add.constructor, true)
    })
  })
})

describe('isContractDeletedError', () => {
  // Shaped like the errors thrown by `handleFetchResult` in @chelonia/lib
  const fetchError = (name, status) => Object.assign(new Error(`${status}: x`, { cause: status }), { name })

  it('only a 410 means that the contract was deleted', () => {
    assert.equal(isContractDeletedError(fetchError('ChelErrorResourceGone', 410)), true)
    // The server doesn't have the contract: not authoritative
    assert.equal(isContractDeletedError(fetchError('ChelErrorResourceGone', 404)), false)
    assert.equal(isContractDeletedError(fetchError('ChelErrorUnexpectedHttpResponseCode', 503)), false)
    assert.equal(isContractDeletedError(new TypeError('Failed to fetch')), false)
    assert.equal(isContractDeletedError(undefined), false)
  })
})
