/* eslint-env mocha */
import assert from 'node:assert/strict'
import { createNamespaceResolver, NAMESPACE_UNREGISTERED_TTL, NAMESPACE_VERIFY_TTL } from './namespaceResolver.js'

const deferred = () => {
  let fulfill, fail
  const promise = new Promise((resolve, reject) => { fulfill = resolve; fail = reject })
  return { promise, resolve: fulfill, reject: fail }
}

const harness = ({ requestTimeout } = {}) => {
  const cache = Object.create(null)
  const requests = []
  const projections = []
  let clock = 1000
  const resolver = createNamespaceResolver({
    fetchName: (name, signal) => {
      const d = deferred()
      requests.push({ name, signal, ...d })
      return d.promise
    },
    readCache: (name) => cache[name] ?? null,
    project: (name, value) => {
      projections.push([name, value])
      if (value === null) delete cache[name]
      else cache[name] = value
    },
    now: () => clock,
    ...(requestTimeout ? { requestTimeout } : {})
  })
  const flush = () => new Promise(resolve => setTimeout(resolve, 0))
  return { resolver, cache, requests, projections, flush, tick: (ms) => { clock += ms } }
}

describe('namespace resolver', () => {
  it('shares concurrent lookups, with and without skipCache', async () => {
    const t = harness()
    const calls = [
      t.resolver.lookup('alice'),
      t.resolver.lookup('alice', { skipCache: true }),
      t.resolver.lookup('alice', { skipCache: true })
    ]
    await t.flush()
    assert.equal(t.requests.length, 1)
    t.requests[0].resolve('id-alice')
    assert.deepEqual(await Promise.all(calls), ['id-alice', 'id-alice', 'id-alice'])
    assert.equal(t.cache.alice, 'id-alice')
  })

  it('reuses an answer for skipCache callers until the window expires', async () => {
    const t = harness()
    const first = t.resolver.lookup('alice', { skipCache: true })
    await t.flush()
    t.requests[0].resolve('id-alice')
    await first
    for (let i = 0; i < 10; i++) {
      assert.equal(await t.resolver.lookup('alice', { skipCache: true }), 'id-alice')
    }
    assert.equal(t.requests.length, 1)
    t.tick(NAMESPACE_VERIFY_TTL - 1)
    await t.resolver.lookup('alice', { skipCache: true })
    assert.equal(t.requests.length, 1)
    t.tick(1)
    const after = t.resolver.lookup('alice', { skipCache: true })
    await t.flush()
    assert.equal(t.requests.length, 2)
    t.requests[1].resolve('id-alice')
    assert.equal(await after, 'id-alice')
  })

  it('serves cached names without a request unless skipCache is set', async () => {
    const t = harness()
    t.cache.bob = 'id-bob'
    assert.equal(await t.resolver.lookup('bob'), 'id-bob')
    assert.equal(t.requests.length, 0)
  })

  it('reuses "not registered" answers only briefly', async () => {
    const t = harness()
    const first = t.resolver.lookup('ghost')
    await t.flush()
    t.requests[0].resolve(null)
    assert.equal(await first, null)
    assert.equal(await t.resolver.lookup('ghost'), null)
    assert.equal(await t.resolver.lookup('ghost', { skipCache: true }), null)
    assert.equal(t.requests.length, 1)
    t.tick(NAMESPACE_UNREGISTERED_TTL - 1)
    assert.equal(await t.resolver.resolve('ghost'), null)
    assert.equal(t.requests.length, 1)
    // The name may have been registered since (e.g., on another device)
    t.tick(1)
    const after = t.resolver.lookup('ghost', { skipCache: true })
    await t.flush()
    assert.equal(t.requests.length, 2)
    t.requests[1].resolve('id-ghost')
    assert.equal(await after, 'id-ghost')
    assert.equal(t.cache.ghost, 'id-ghost')
  })

  it('keeps reusing registered answers after "not registered" ones expire', async () => {
    const t = harness()
    const first = t.resolver.resolve('alice')
    await t.flush()
    t.requests[0].resolve('id-alice')
    await first
    t.tick(NAMESPACE_UNREGISTERED_TTL)
    assert.equal(await t.resolver.resolve('alice'), 'id-alice')
    assert.equal(t.requests.length, 1)
  })

  it('never reuses errors', async () => {
    const t = harness()
    const first = t.resolver.lookup('carol', { skipCache: true })
    await t.flush()
    t.requests[0].reject(new Error('503: Service Unavailable'))
    await assert.rejects(first, /503/)
    const second = t.resolver.lookup('carol', { skipCache: true })
    await t.flush()
    assert.equal(t.requests.length, 2)
    t.requests[1].resolve('id-carol')
    assert.equal(await second, 'id-carol')
  })

  it('forceRefresh starts a new request and the superseded answer is not cached', async () => {
    const t = harness()
    const old = t.resolver.lookup('dave', { skipCache: true })
    await t.flush()
    const fresh = t.resolver.lookup('dave', { forceRefresh: true })
    await t.flush()
    assert.equal(t.requests.length, 2)
    t.requests[1].resolve('id-new')
    assert.equal(await fresh, 'id-new')
    t.requests[0].resolve('id-old')
    assert.equal(await old, 'id-old')
    assert.equal(t.cache.dave, 'id-new')
    assert.equal(await t.resolver.lookup('dave', { skipCache: true }), 'id-new')
    assert.equal(t.requests.length, 2)
  })

  it('answers requested before a reset are returned but not cached', async () => {
    const t = harness()
    const before = t.resolver.lookup('erin', { skipCache: true })
    await t.flush()
    t.resolver.reset()
    t.requests[0].resolve('id-erin')
    assert.equal(await before, 'id-erin')
    assert.equal(t.cache.erin, undefined)
    // Callers after the reset reuse the answer and cache it
    assert.equal(await t.resolver.lookup('erin', { skipCache: true }), 'id-erin')
    assert.equal(t.cache.erin, 'id-erin')
    assert.equal(t.requests.length, 1)
  })

  it('resolve never writes the cache, and a later lookup reuses its answer', async () => {
    const t = harness()
    const answer = t.resolver.resolve('frank')
    await t.flush()
    t.requests[0].resolve('id-frank')
    assert.equal(await answer, 'id-frank')
    assert.equal(t.cache.frank, undefined)
    assert.equal(t.projections.length, 0)
    assert.equal(await t.resolver.lookup('frank', { skipCache: true }), 'id-frank')
    assert.equal(t.cache.frank, 'id-frank')
    assert.equal(t.requests.length, 1)
  })

  it('resolve with forceRefresh starts a new request, whose answer is then reused', async () => {
    const t = harness()
    const first = t.resolver.resolve('hank')
    await t.flush()
    t.requests[0].resolve('id-old')
    assert.equal(await first, 'id-old')
    assert.equal(await t.resolver.resolve('hank'), 'id-old')
    assert.equal(t.requests.length, 1)
    const fresh = t.resolver.resolve('hank', { forceRefresh: true })
    await t.flush()
    assert.equal(t.requests.length, 2)
    t.requests[1].resolve('id-new')
    assert.equal(await fresh, 'id-new')
    assert.equal(await t.resolver.lookup('hank', { skipCache: true }), 'id-new')
    assert.equal(t.cache.hank, 'id-new')
    assert.equal(t.requests.length, 2)
  })

  it('invalidate forces a new request and stops a pending answer from being cached', async () => {
    const t = harness()
    const pending = t.resolver.lookup('gina', { skipCache: true })
    await t.flush()
    t.resolver.invalidate('gina')
    t.requests[0].resolve(null)
    assert.equal(await pending, null)
    const next = t.resolver.lookup('gina')
    await t.flush()
    assert.equal(t.requests.length, 2)
    t.requests[1].resolve('id-gina')
    assert.equal(await next, 'id-gina')
    assert.equal(t.cache.gina, 'id-gina')
  })

  describe('requests with no answer', () => {
    const TIMEOUT = 40
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    it('reject every waiting caller when the time limit runs out, and are aborted', async () => {
      const t = harness({ requestTimeout: TIMEOUT })
      const outcomes = [
        t.resolver.lookup('hank', { skipCache: true }),
        t.resolver.lookup('hank'),
        t.resolver.resolve('hank')
      ].map(p => p.then(() => 'resolved', (e) => e.message))
      await t.flush()
      assert.equal(t.requests.length, 1)
      assert.equal(t.requests[0].signal.aborted, false)
      await sleep(TIMEOUT * 2)
      assert.deepEqual(await Promise.all(outcomes), Array(3).fill('Timed out looking up the name hank'))
      assert.equal(t.requests[0].signal.aborted, true)
    })

    it('report the time limit, not the aborted request, as the error', async () => {
      // Like `fetch`, this request rejects as soon as it's aborted
      const resolver = createNamespaceResolver({
        fetchName: (name, signal) => new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('The operation was aborted')))
        }),
        readCache: () => null,
        project: () => {},
        requestTimeout: TIMEOUT
      })
      await assert.rejects(resolver.lookup('liam', { skipCache: true }), /Timed out looking up the name liam/)
    })

    it('are not reused: the next call makes a new request', async () => {
      const t = harness({ requestTimeout: TIMEOUT })
      const first = t.resolver.lookup('ivy', { skipCache: true })
      await assert.rejects(first, /Timed out/)
      const second = t.resolver.lookup('ivy', { skipCache: true })
      await t.flush()
      assert.equal(t.requests.length, 2)
      t.requests[1].resolve('id-ivy')
      assert.equal(await second, 'id-ivy')
      assert.equal(t.cache.ivy, 'id-ivy')
    })

    it('do not write a late answer into the cache', async () => {
      const t = harness({ requestTimeout: TIMEOUT })
      await assert.rejects(t.resolver.lookup('jack', { skipCache: true }), /Timed out/)
      t.requests[0].resolve('id-late')
      await t.flush()
      assert.equal(t.cache.jack, undefined)
      assert.equal(t.projections.length, 0)
    })

    it('do not time out answers that arrive in time', async () => {
      const t = harness({ requestTimeout: TIMEOUT })
      const answer = t.resolver.lookup('kate', { skipCache: true })
      await t.flush()
      t.requests[0].resolve('id-kate')
      assert.equal(await answer, 'id-kate')
      await sleep(TIMEOUT * 2)
      assert.equal(t.requests[0].signal.aborted, false)
      assert.equal(await t.resolver.lookup('kate', { skipCache: true }), 'id-kate')
      assert.equal(t.requests.length, 1)
    })
  })
})
