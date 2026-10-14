'use strict'
/* eslint-env mocha */

// Regression tests for Chelonia state changes made while the service worker
// (SW) starts up being lost when the SW is stopped. Because of that, the
// "Less than 1 week left" notification was shown again on every SW cold start
// (https://github.com/okTurtles/group-income/issues/3158).
//
// Each SW lifetime runs the real SW script (sw-primary.js, which calls
// setupChelonia.js) in a new worker thread, so that every cold start begins
// with fresh modules and globals, like a real SW does. The worker is then
// terminated without any shutdown hook, like browsers do with idle SWs.
// Only the environment is simulated: IndexedDB (file-backed, so that stored
// data survives across lifetimes), the SW global scope, an unreachable server
// and no focused window (so notifications are shown natively).
//
// This file is both the test (main thread) and the code run by the workers.

const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const v8 = require('node:v8')
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads')

const ROOT = path.resolve(__dirname, '..')
const ALICE = 'zIdentityAliceXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
const BOB = 'zIdentityBobXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
const GROUP = 'zGroupXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
const DAY = 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Worker side
// ---------------------------------------------------------------------------

// The subset of IndexedDB used by frontend/model/localforage.js, with one file
// per database. A write is durable as soon as it's made, and values are cloned
// when `put` is called using the same algorithm as IndexedDB (structured
// clone), so values that can't be stored throw like they would in a browser.
const createFakeIndexedDB = (dir, onPut) => {
  const fileFor = (name) => path.join(dir, encodeURIComponent(name) + '.idb')
  const load = (name) => {
    const file = fileFor(name)
    return fs.existsSync(file) ? v8.deserialize(fs.readFileSync(file)) : { version: 0, stores: {} }
  }
  const persist = (name, data) => {
    const file = fileFor(name)
    fs.writeFileSync(file + '.tmp', v8.serialize(data))
    fs.renameSync(file + '.tmp', file)
  }
  const later = (fn) => setTimeout(fn, 1)

  const makeDb = (name, data) => ({
    get version () { return data.version },
    objectStoreNames: { contains: (storeName) => Object.prototype.hasOwnProperty.call(data.stores, storeName) },
    createObjectStore (storeName) {
      data.stores[storeName] = data.stores[storeName] || {}
      persist(name, data)
    },
    transaction (storeNames, mode) {
      const tx = {}
      let pending = 0
      const done = () => { if (--pending === 0) later(() => tx.oncomplete?.()) }
      const request = (fn) => {
        const req = {}
        let result, error
        pending++
        try { result = fn() } catch (e) { error = e }
        later(() => {
          if (error) {
            req.error = error
            req.onerror?.({ target: req })
            tx.onerror?.({ target: req })
          } else {
            req.result = result
            req.onsuccess?.({ target: req })
          }
          done()
        })
        return req
      }
      tx.objectStore = (storeName) => {
        const write = (fn) => {
          if (mode !== 'readwrite') throw new Error('ReadOnlyError')
          fn()
          persist(name, data)
        }
        return {
          get: (key) => request(() => {
            const raw = data.stores[storeName][key]
            return raw === undefined ? undefined : v8.deserialize(raw)
          }),
          getAllKeys: () => request(() => Object.keys(data.stores[storeName])),
          put (value, key) {
            const raw = v8.serialize(value)
            return request(() => {
              write(() => { data.stores[storeName][key] = raw })
              onPut(key, value)
            })
          },
          delete: (key) => request(() => write(() => { delete data.stores[storeName][key] })),
          clear: () => request(() => write(() => { data.stores[storeName] = {} }))
        }
      }
      return tx
    }
  })

  return {
    open (name, version) {
      const req = {}
      later(() => {
        const data = load(name)
        const db = makeDb(name, data)
        if ((version !== undefined && version > data.version) || data.version === 0) {
          data.version = version ?? 1
          persist(name, data)
          req.onupgradeneeded?.({ target: { result: db } })
        }
        req.onsuccess?.({ target: { result: db } })
      })
      return req
    }
  }
}

// Loads frontend modules like the build does: the project's Babel config and
// the esbuild path aliases from Gruntfile.js.
const registerFrontendModules = () => {
  // babel-plugin-root-import resolves `~/` from here
  global.rootPath = ROOT
  require('@babel/register')({
    cwd: ROOT,
    cache: false,
    extensions: ['.js'],
    only: [path.join(ROOT, 'frontend')],
    plugins: [
      ['module-resolver', {
        root: [ROOT],
        alias: {
          '@assets': path.join(ROOT, 'frontend/assets'),
          '@common': path.join(ROOT, 'frontend/common'),
          '@components': path.join(ROOT, 'frontend/views/components'),
          '@containers': path.join(ROOT, 'frontend/views/containers'),
          '@controller': path.join(ROOT, 'frontend/controller'),
          '@model': path.join(ROOT, 'frontend/model'),
          '@pages': path.join(ROOT, 'frontend/views/pages'),
          '@svgs': path.join(ROOT, 'frontend/assets/svgs'),
          '@utils': path.join(ROOT, 'frontend/utils'),
          '@view-utils': path.join(ROOT, 'frontend/views/utils'),
          '@views': path.join(ROOT, 'frontend/views')
        }
      }]
    ]
  })

  // `manifests.json` is generated by `grunt build`. No contract code runs here
  // (the server is unreachable), so an empty list is enough.
  const Module = require('node:module')
  const manifestsFile = path.join(ROOT, 'frontend/model/contracts/manifests.json')
  const resolveFilename = Module._resolveFilename
  Module._resolveFilename = function (request, ...args) {
    if (request.endsWith('model/contracts/manifests.json')) return manifestsFile
    return resolveFilename.call(this, request, ...args)
  }
  const manifests = new Module(manifestsFile)
  manifests.filename = manifestsFile
  manifests.loaded = true
  manifests.exports = { manifests: {} }
  require.cache[manifestsFile] = manifests
}

const setUpServiceWorkerScope = ({ idbDir, onPut, onNotification, messageListeners }) => {
  // The app's logs aren't relevant to the test results
  const noop = () => {}
  globalThis.console = Object.fromEntries(Object.keys(console).map((k) => [k, noop]))
  // In a SW, an unhandled rejection is only logged
  process.on('unhandledRejection', noop)
  Object.assign(process.env, { APP_VERSION: '0.0.0-test', LIGHTWEIGHT_CLIENT: 'true', NODE_ENV: 'production' })

  globalThis.self = globalThis
  globalThis.WorkerGlobalScope = function WorkerGlobalScope () {}
  self.indexedDB = createFakeIndexedDB(idbDir, onPut)
  self.location = new URL('http://127.0.0.1:1/assets/js/sw-primary.js?routerBase=&standalone=0')
  self.addEventListener = (type, fn) => { if (type === 'message') messageListeners.push(fn) }
  self.skipWaiting = () => Promise.resolve()
  self.Notification = function Notification () {}
  self.clients = {
    matchAll: () => Promise.resolve([]),
    claim: () => Promise.resolve(),
    get: () => Promise.resolve(undefined)
  }
  self.registration = {
    showNotification: (title, { body } = {}) => {
      onNotification({ title, body })
      return Promise.resolve()
    },
    unregister: () => Promise.resolve(true)
  }
}

const loadSbp = () => {
  const sbp = require('@sbp/sbp').default
  require('@sbp/okturtles.data')
  require('@sbp/okturtles.events')
  require('@sbp/okturtles.eventqueue')
  return sbp
}

// A session in which Alice pledges in a group with a 30-day distribution period
// and Bob needs income, so Alice has payments to make. By default, the period
// ends in 3 days, so the "Less than 1 week left" notification is due.
const seed = async ({ daysIntoPeriod = 27 } = {}) => {
  const sbp = loadSbp()
  const { SETTING_CHELONIA_STATE, SETTING_CURRENT_USER } = require(path.join(ROOT, 'frontend/model/database.js'))
  const { makeNotificationHash } = require(path.join(ROOT, 'frontend/model/notifications/utils.js'))
  const { dateToPeriodStamp, addTimeToDate } = require(path.join(ROOT, 'frontend/model/contracts/shared/time.js'))

  const now = new Date()
  const currentPeriod = dateToPeriodStamp(addTimeToDate(now, -daysIntoPeriod * DAY))
  const joinedDate = addTimeToDate(now, -90 * DAY).toISOString()
  // Already shown, so that it isn't due
  const newPeriodNotification = {
    title: 'Group',
    body: 'A new distribution period has started. Please check Payment TODOs.',
    plaintextBody: 'A new distribution period has started. Please check Payment TODOs.',
    level: 'info',
    icon: 'coins',
    linkTo: '/payments',
    scope: 'group',
    data: { period: currentPeriod },
    groupID: GROUP,
    avatarUserID: ALICE,
    hash: makeNotificationHash({ groupID: GROUP, period: currentPeriod, creatorID: ALICE, memberType: 'pledger', type: 'NEW_DISTRIBUTION_PERIOD' }),
    timestamp: new Date(currentPeriod).getTime(),
    type: 'NEW_DISTRIBUTION_PERIOD'
  }
  await sbp('gi.db/settings/save', SETTING_CURRENT_USER, ALICE)
  await sbp('gi.db/settings/save', SETTING_CHELONIA_STATE, {
    loggedIn: { identityContractID: ALICE },
    contracts: {
      [ALICE]: { type: 'gi.contracts/identity', HEAD: 'zHeadAlice', height: 12, previousKeyOp: 'zKeyOpAlice', references: 1 },
      [BOB]: { type: 'gi.contracts/identity', HEAD: 'zHeadBob', height: 8, previousKeyOp: 'zKeyOpBob', references: 1 },
      [GROUP]: { type: 'gi.contracts/group', HEAD: 'zHeadGroup', height: 40, previousKeyOp: 'zKeyOpGroup', references: 1 }
    },
    [ALICE]: {
      attributes: { username: 'alice', displayName: 'Alice' },
      groups: { [GROUP]: { hasLeft: false, hash: 'zJoinHash', inviteSecretId: 'zInviteSecret' } }
    },
    [BOB]: { attributes: { username: 'bob', displayName: 'Bob' } },
    [GROUP]: {
      settings: {
        groupName: 'Group',
        mincomeAmount: 1000,
        mincomeCurrency: 'USD',
        distributionDate: currentPeriod,
        distributionPeriodLength: 30 * DAY,
        minimizeDistribution: true,
        proposals: {}
      },
      profiles: {
        [ALICE]: { status: 'active', joinedDate, incomeDetailsType: 'pledgeAmount', pledgeAmount: 300, nonMonetaryContributions: [] },
        [BOB]: { status: 'active', joinedDate, incomeDetailsType: 'incomeAmount', incomeAmount: 700, nonMonetaryContributions: [] }
      },
      paymentsByPeriod: { [currentPeriod]: { paymentsFrom: {} } },
      payments: {},
      proposals: {},
      chatRooms: {}
    },
    notifications: { items: [newPeriodNotification] },
    namespaceLookups: { alice: ALICE, bob: BOB },
    reverseNamespaceLookups: { [ALICE]: 'alice', [BOB]: 'bob' },
    secretKeys: {}
  })
}

// What a restarted SW would load
const readSavedState = () => {
  const sbp = loadSbp()
  const { SETTING_CHELONIA_STATE } = require(path.join(ROOT, 'frontend/model/database.js'))
  return sbp('gi.db/settings/load', SETTING_CHELONIA_STATE)
}

// One SW lifetime: a cold start woken up by `wake`, until setup is done and
// state saves have settled.
const lifetime = async ({ wake, messageListeners, shown, stateWrites }) => {
  const sbp = loadSbp()
  const { SETTING_CHELONIA_STATE } = require(path.join(ROOT, 'frontend/model/database.js'))
  const { NEW_CHATROOM_SCROLL_POSITION } = require(path.join(ROOT, 'frontend/utils/events.js'))
  const deliver = (data) => {
    messageListeners.forEach((fn) => fn({ data, source: { id: 'tab', postMessage () {} } }))
  }

  require(path.join(ROOT, 'frontend/controller/serviceworkers/sw-primary.js'))
  deliver({
    // The keep-alive ping sent by open tabs (service-worker.js)
    ping: { type: 'ping' },
    // Sent by a tab when the user scrolls a chat (service-worker.js)
    scroll: { type: 'event', subtype: NEW_CHATROOM_SCROLL_POSITION, data: [{ chatRoomID: 'zChatRoom', messageHash: 'zMessage' }] }
  }[wake])

  // Sent by tabs to wait for setup to finish. It doesn't start anything that
  // isn't already running.
  const setup = await new Promise((resolve) => {
    deliver({ type: 'ready', port: { postMessage: ({ type }) => resolve(type), close () {} } })
  })
  await new Promise((resolve) => setTimeout(resolve, 200))
  await sbp('okTurtles.eventQueue/queueEvent', SETTING_CHELONIA_STATE, () => {})
  return { setup, shown, stateWrites }
}

const runJob = ({ job, idbDir, wake, seedOptions }) => {
  const messageListeners = []
  const shown = []
  const stateWrites = []
  setUpServiceWorkerScope({
    idbDir,
    messageListeners,
    onNotification: (notification) => shown.push(notification),
    onPut: (key, value) => {
      if (!key.endsWith('CHELONIA_STATE')) return
      stateWrites.push({ loggedIn: value?.loggedIn, contractIDs: Object.keys(value?.contracts || {}).sort() })
    }
  })
  registerFrontendModules()
  if (job === 'seed') return seed(seedOptions)
  if (job === 'read') return readSavedState()
  return lifetime({ wake, messageListeners, shown, stateWrites })
}

// ---------------------------------------------------------------------------
// Main thread (test)
// ---------------------------------------------------------------------------

const runInWorker = (data) => new Promise((resolve, reject) => {
  const worker = new Worker(__filename, { workerData: data })
  let reply
  worker.once('message', (message) => {
    reply = message
    // Stop the SW, as the browser does
    worker.terminate()
  })
  worker.once('error', reject)
  worker.once('exit', (code) => {
    if (!reply) reject(new Error(`Worker for ${data.job} exited with code ${code} without a result`))
    else if (reply.error) reject(new Error(`Worker for ${data.job} failed: ${reply.error}`))
    else resolve(reply.result)
  })
})

if (!isMainThread) {
  Promise.resolve().then(() => runJob(workerData)).then(
    (result) => parentPort.postMessage({ result }),
    (e) => parentPort.postMessage({ error: e?.stack || String(e) })
  )
} else {
  describe('setupChelonia: Chelonia state across service worker restarts', function () {
    this.timeout(120e3)

    let idbDir
    const seedSession = (seedOptions) => runInWorker({ job: 'seed', idbDir, seedOptions })
    const loadSavedState = () => runInWorker({ job: 'read', idbDir })
    const startServiceWorker = async (wake) => {
      const result = await runInWorker({ job: 'lifetime', idbDir, wake })
      assert.equal(result.setup, 'ready', 'the SW finished setting up')
      return result
    }
    const isNearDistributionEnd = (n) => /Less than 1 week left/.test(n.body)

    beforeEach(function () {
      idbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gi-sw-restarts-'))
    })

    afterEach(function () {
      fs.rmSync(idbDir, { recursive: true, force: true })
    })

    it('saves notifications emitted while the SW starts up, so that restarting it does not show them again (#3158)', async function () {
      await seedSession()
      const first = await startServiceWorker('ping')
      assert.equal(first.shown.filter(isNearDistributionEnd).length, 1, 'the due notification is shown')

      const saved = await loadSavedState()
      assert.ok(saved.notifications.items.some((n) => n.type === 'NEAR_DISTRIBUTION_END'), 'the notification was saved before the SW was stopped')

      const second = await startServiceWorker('ping')
      assert.deepEqual(second.shown, [], 'restarting the SW shows no notification again')
    })

    it('never overwrites the saved state before restoring it, even if a tab event wakes up the SW', async function () {
      await seedSession({ daysIntoPeriod: 10 })
      const before = await loadSavedState()
      const { shown, stateWrites } = await startServiceWorker('scroll')
      assert.deepEqual(shown, [], 'no notification is due, so only the tab event can save the state')
      assert.ok(stateWrites.length > 0, 'the tab event caused the SW to save the Chelonia state')
      const session = { loggedIn: before.loggedIn, contractIDs: Object.keys(before.contracts).sort() }
      stateWrites.forEach((written, i) => {
        assert.deepEqual(written, session, `state save #${i + 1} contains the restored session`)
      })

      const after = await loadSavedState()
      for (const key of Object.keys(before)) {
        if (key === 'notifications') {
          const hashes = new Set(after.notifications.items.map((n) => n.hash))
          assert.ok(before.notifications.items.every((n) => hashes.has(n.hash)), 'saved notifications are kept')
        } else {
          assert.deepEqual(after[key], before[key], `saved '${key}' is kept`)
        }
      }
    })
  })
}
