import { assertEquals, assertMatch } from "https://deno.land/std@0.153.0/testing/asserts.ts"

import { bold, red, yellow } from 'fmt/colors.ts'
import * as pathlib from 'path'

import '~/scripts/process-shim.ts'

import sbp from '@sbp/sbp'
import '@sbp/okturtles.events'
import '@sbp/okturtles.eventqueue'
import '~/shared/domains/chelonia/chelonia.ts'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.ts'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'
import { blake32Hash } from '~/shared/functions.ts'
import * as Common from './common/common.js'
import proposals from './contracts/shared/voting/proposals.js'
import { PAYMENT_PENDING, PAYMENT_TYPE_MANUAL } from './contracts/shared/payments/index.js'
import { INVITE_INITIAL_CREATOR, INVITE_EXPIRES_IN_DAYS, MAIL_TYPE_MESSAGE, PROPOSAL_INVITE_MEMBER, PROPOSAL_REMOVE_MEMBER, PROPOSAL_GROUP_SETTING_CHANGE, PROPOSAL_PROPOSAL_SETTING_CHANGE, PROPOSAL_GENERIC } from './contracts/shared/constants.js'
import { createInvite } from './contracts/shared/functions.js'
import '~/frontend/controller/namespace.js'
import { THEME_LIGHT } from '~/frontend/utils/themes.js'
import manifests from '~/frontend/model/contracts/manifests.json' assert { type: "json" }
import packageJSON from '~/package.json' assert { type: 'json' }

const { version } = packageJSON

// var unsignedMsg = sign(personas[0], 'futz')

// TODO: replay attacks? (need server-provided challenge for `msg`?)
//       nah, this should be taken care of by TLS. However, for message
//       passing we should be using a forward-secure protocol. See
//       MessageRelay in interface.js.

// TODO: the request for members of a group should be made with a group
//       key or a group signature. There should not be a mapping of a
//       member's key to all the groups that they're in (that's unweildy
//       and compromises privacy).

/**
 * Creates a modified copy of the given `process.env` object, according to its `PORT_SHIFT` variable.
 *
 * The `API_PORT` and `API_URL` variables will be updated.
 * TODO: make the protocol (http vs https) variable based on environment var.
 * @param {Object} env
 * @returns {Object}
 */
const applyPortShift = (env) => {
  // TODO: implement automatic port selection when `PORT_SHIFT` is 'auto'.
  const API_PORT = 8000 + Number.parseInt(env.PORT_SHIFT || '0')
  const API_URL = 'http://127.0.0.1:' + API_PORT

  if (Number.isNaN(API_PORT) || API_PORT < 8000 || API_PORT > 65535) {
    throw new RangeError(`Invalid API_PORT value: ${API_PORT}.`)
  }
  return { ...env, API_PORT, API_URL }
}

Object.assign(process.env, applyPortShift(process.env))

Deno.env.set('GI_VERSION', `${version}@${new Date().toISOString()}`)

const API_PORT = Deno.env.get('API_PORT')
const API_URL = Deno.env.get('API_URL')
const CI = Deno.env.get('CI')
const GI_VERSION = Deno.env.get('GI_VERSION')
const NODE_ENV = Deno.env.get('NODE_ENV') ?? 'development'

console.info('GI_VERSION:', GI_VERSION)
console.info('NODE_ENV:', NODE_ENV)

const vuexState = {
  currentGroupId: null,
  currentChatRoomIDs: {},
  contracts: {}, // contractIDs => { type:string, HEAD:string } (for contracts we've successfully subscribed to)
  pending: [], // contractIDs we've just published but haven't received back yet
  loggedIn: false, // false | { username: string, identityContractID: string }
  theme: THEME_LIGHT,
  fontSize: 1,
  increasedContrast: false,
  namespaceLookups: Object.create(null),
  reducedMotion: false,
  appLogsFilter: ['error', 'info', 'warn']
}

// this is to ensure compatibility between frontend and test/backend.test.js
sbp('okTurtles.data/set', 'API_URL', process.env.API_URL)

sbp('sbp/selectors/register', {
  // for handling the loggedIn metadata() in Contracts.js
  'state/vuex/state': () => {
    return vuexState
  }
})

sbp('sbp/selectors/register', {
  'backend.tests/postEntry': async function (entry) {
    console.log(bold(yellow('sending entry with hash:'), entry.hash()))
    const res = await sbp('chelonia/private/out/publishEvent', entry)
    assertEquals(res, entry.hash())
    return res
  }
})

// uncomment this to help with debugging:
// sbp('sbp/filters/global/add', (domain, selector, data) => {
//   console.log(`[sbp] ${selector}:`, data)
// })

Deno.test({
  name: 'Full walkthrough',
  fn: async function (tests) {
    const users = {}
    const groups = {}

    // Wait for the server to be ready.
    let t0 = Date.now()
    let timeout = 30000
    await new Promise((resolve, reject) => {
      (function ping () {
        console.log(process.env.API_URL)
        fetch(process.env.API_URL).then(resolve).catch(() => {
          if (Date.now() > t0 + timeout) {
            reject(new Error('Test setup timed out.'))
          } else {
            setTimeout(ping, 100)
          }
        })
      })()
    })

    await tests.step('Should configure chelonia', async function () {
      await sbp('chelonia/configure', {
        connectionURL: process.env.API_URL,
        stateSelector: 'state/vuex/state',
        skipSideEffects: true,
        connectionOptions: {
          reconnectOnDisconnection: false,
          reconnectOnOnline: false,
          reconnectOnTimeout: false,
          timeout: 3000
        },
        contracts: {
          ...manifests,
          defaults: {
            modules: { '@common/common.js': Common },
            allowedSelectors: [
              'state/vuex/state', 'state/vuex/commit', 'state/vuex/getters',
              'chelonia/contract/sync', 'chelonia/contract/remove', 'controller/router',
              'chelonia/queueInvocation', 'gi.actions/identity/updateLoginStateUponLogin',
              'gi.actions/chatroom/leave', 'gi.notifications/emit'
            ],
            allowedDomains: ['okTurtles.data', 'okTurtles.events', 'okTurtles.eventQueue'],
            preferSlim: true
          }
        }
      })
    })

    function login (user) {
      // we set this so that the metadata on subsequent messages is properly filled in
      // currently group and mailbox contracts use this to determine message sender
      vuexState.loggedIn = {
        username: user.decryptedValue().data.attributes.username,
        identityContractID: user.contractID()
      }
    }

    async function createIdentity (username, email, testFn) {
      // append random id to username to prevent conflict across runs
      // when GI_PERSIST environment variable is defined
      username = `${username}-${Math.floor(Math.random() * 1000)}`
      const msg = await sbp('chelonia/out/registerContract', {
        contractName: 'gi.contracts/identity',
        data: {
          // authorizations: [Events.CanModifyAuths.dummyAuth(name)],
          attributes: { username, email }
        },
        hooks: {
          prepublish: (message) => { message.decryptedValue(JSON.parse) },
          postpublish: (message) => { testFn && testFn(message) }
        }
      })
      return msg
    }
    function createGroup (name: string, hooks: Object = {}): Promise {
      const initialInvite = createInvite({
        quantity: 60,
        creator: INVITE_INITIAL_CREATOR,
        expires: INVITE_EXPIRES_IN_DAYS.ON_BOARDING
      })
      return sbp('chelonia/out/registerContract', {
        contractName: 'gi.contracts/group',
        data: {
          invites: {
            [initialInvite.inviteSecret]: initialInvite
          },
          settings: {
            // authorizations: [Events.CanModifyAuths.dummyAuth(name)],
            groupName: name,
            groupPicture: '',
            sharedValues: 'our values',
            mincomeAmount: 1000,
            mincomeCurrency: 'USD',
            distributionDate: new Date().toISOString(),
            minimizeDistribution: true,
            proposals: {
              [PROPOSAL_GROUP_SETTING_CHANGE]: proposals[PROPOSAL_GROUP_SETTING_CHANGE].defaults,
              [PROPOSAL_INVITE_MEMBER]: proposals[PROPOSAL_INVITE_MEMBER].defaults,
              [PROPOSAL_REMOVE_MEMBER]: proposals[PROPOSAL_REMOVE_MEMBER].defaults,
              [PROPOSAL_PROPOSAL_SETTING_CHANGE]: proposals[PROPOSAL_PROPOSAL_SETTING_CHANGE].defaults,
              [PROPOSAL_GENERIC]: proposals[PROPOSAL_GENERIC].defaults
            }
          }
        },
        hooks
      })
    }
    function createPaymentTo (to, amount, contractID, currency = 'USD'): Promise {
      return sbp('chelonia/out/actionEncrypted', {
        action: 'gi.contracts/group/payment',
        data: {
          toUser: to.decryptedValue().data.attributes.username,
          amount: amount,
          currency: currency,
          txid: String(parseInt(Math.random() * 10000000)),
          status: PAYMENT_PENDING,
          paymentType: PAYMENT_TYPE_MANUAL
        },
        contractID
      })
    }

    async function createMailboxFor (user) {
      const mailbox = await sbp('chelonia/out/registerContract', {
        contractName: 'gi.contracts/mailbox',
        data: {}
      })
      await sbp('chelonia/out/actionEncrypted', {
        action: 'gi.contracts/identity/setAttributes',
        data: { mailbox: mailbox.contractID() },
        contractID: user.contractID()
      })
      user.mailbox = mailbox
      await sbp('chelonia/contract/sync', mailbox.contractID())
      return mailbox
    }

    await tests.step('Identity tests', async function (t) {
      await t.step('Should create identity contracts for Alice and Bob', async function () {
        users.bob = await createIdentity('bob', 'bob@okturtles.com')
        users.alice = await createIdentity('alice', 'alice@okturtles.org')
        // verify attribute creation and state initialization
        assertMatch(users.bob.decryptedValue().data.attributes.username, /^bob/)
        assertEquals(users.bob.decryptedValue().data.attributes.email, 'bob@okturtles.com')
      })

      await t.step('Should register Alice and Bob in the namespace', async function () {
        const { alice, bob } = users
        let res = await sbp('namespace/register', alice.decryptedValue().data.attributes.username, alice.contractID())
        // NOTE: don't rely on the return values for 'namespace/register'
        //       too much... in the future we might remove these checks
        assertEquals(res.value, alice.contractID())
        res = await sbp('namespace/register', bob.decryptedValue().data.attributes.username, bob.contractID())
        assertEquals(res.value, bob.contractID())
        alice.socket = 'hello'
        assertEquals(alice.socket, 'hello')
      })

      await t.step('Should verify namespace lookups work', async function () {
        const { alice } = users
        const username = alice.decryptedValue().data.attributes.username
        const res = await sbp('namespace/lookup', username)
        assertEquals(res, alice.contractID())
        const contractID = await sbp('namespace/lookup', 'susan')
        assertEquals(contractID, null)
      })

      await t.step('Should open socket for Alice', async function () {
        users.alice.socket = await sbp('chelonia/connect')
      })

      await t.step('Should create mailboxes for Alice and Bob and subscribe', async function () {
        await createMailboxFor(users.alice)
        await createMailboxFor(users.bob)
      })
    })

    await tests.step('Group tests', async function (t) {
      await t.step('Should create a group & subscribe Alice', async function () {
        // Set user Alice as being logged in so that metadata on messages is properly set.
        login(users.alice)
        groups.group1 = await createGroup('group1')
        await sbp('chelonia/contract/sync', groups.group1.contractID())
      })

      // NOTE: The frontend needs to use the `fetch` API instead of superagent because
      //       superagent doesn't support streaming, whereas fetch does.
      // TODO: We should also remove superagent as a dependency since `fetch` does
      //       everything we need. Use fetch from now on.
      await t.step('Should get mailbox info for Bob', async function () {
        // 1. look up bob's username to get his identity contract
        const { bob } = users
        const bobsName = bob.decryptedValue().data.attributes.username
        const bobsContractId = await sbp('namespace/lookup', bobsName)
        assertEquals(bobsContractId, bob.contractID())
        // 2. fetch all events for his identity contract to get latest state for it
        const state = await sbp('chelonia/latestContractState', bobsContractId)
        console.log(bold(red('FINAL STATE:'), state))
        // 3. get bob's mailbox contractID from his identity contract attributes
        assertEquals(state.attributes.mailbox, bob.mailbox.contractID())
        // 4. fetch the latest hash for bob's mailbox.
        //    we don't need latest state for it just latest hash
        const res = await sbp('chelonia/out/latestHash', state.attributes.mailbox)
        assertEquals(res, bob.mailbox.hash())
      })

      await t.step("Should invite Bob to Alice's group", function (done) {
        const mailbox = users.bob.mailbox
        return new Promise((resolve, reject) => {
          sbp('chelonia/out/actionEncrypted', {
            action: 'gi.contracts/mailbox/postMessage',
            data: {
              from: users.bob.decryptedValue().data.attributes.username,
              messageType: MAIL_TYPE_MESSAGE,
              message: groups.group1.contractID()
            },
            contractID: mailbox.contractID(),
            hooks: {
              prepublish (invite: GIMessage) {
                sbp('okTurtles.events/once', invite.hash(), (contractID: string, entry: GIMessage) => {
                  console.debug('Bob successfully got invite!')
                  assertEquals(entry.decryptedValue().data.message, groups.group1.contractID())
                  resolve()
                })
              }
            }
          })
        })
      })

      await t.step('Should post an event', function () {
        return createPaymentTo(users.bob, 100, groups.group1.contractID())
      })

      await t.step('Should sync group and verify payments in state', async function () {
        await sbp('chelonia/contract/sync', groups.group1.contractID())
        assertEquals(Object.keys(vuexState[groups.group1.contractID()].payments).length, 1)
      })

      await t.step('Should fail with wrong contractID', async function () {
        try {
          await createPaymentTo(users.bob, 100, '')
          return Promise.reject(new Error("shouldn't get here!"))
        } catch (e) {
          return Promise.resolve()
        }
      })

      // TODO: these events, as well as all messages sent over the sockets
      //       should all be authenticated and identified by the user's
      //       identity contract
    })

    await tests.step('File upload', async function (t) {
      await t.step('Should upload "avatar-default.png" as "multipart/form-data"', async function () {
        const form = new FormData()
        const filepath = './frontend/assets/images/user-avatar-default.png'
        // const context = blake2bInit(32, null)
        // const stream = fs.createReadStream(filepath)
        // // the problem here is that we need to get the hash of the file
        // // but doing so consumes the stream, invalidating it and making it
        // // so that we can't simply do `form.append('data', stream)`
        // // I tried creating a secondary piped stream and sending that instead,
        // // however that didn't work.
        // // const pass = new PassThrough() // couldn't get this or Readable to work no matter how I tried
        // // So instead we save the raw buffer and send that, using a hack
        // // to work around a weird bug in hapi or form-data where we have to
        // // specify the filename or otherwise the backend treats the data as a string,
        // // resulting in the wrong hash for some reason. By specifying `filename` the backend
        // // treats it as a Buffer, and we get the correct file hash.
        // // We could of course simply read the file twice, but that seems even more hackish.
        // var buffer
        // const hash = await new Promise((resolve, reject) => {
        //   stream.on('error', e => reject(e))
        //   stream.on('data', chunk => {
        //     buffer = buffer ? Buffer.concat([buffer, chunk]) : chunk
        //     blake2bUpdate(context, chunk)
        //   })
        //   stream.on('end', () => {
        //     const uint8array = blake2bFinal(context)
        //     resolve(multihash.toB58String(multihash.encode(Buffer.from(uint8array.buffer), 'blake2b-32', 32)))
        //   })
        // })
        // since we're just saving the buffer now, we might as well use the simpler readFileSync API
        const buffer = Deno.readFileSync(filepath)
        const hash = blake32Hash(buffer)
        console.log(`hash for ${pathlib.basename(filepath)}: ${hash}`)
        form.append('hash', hash)
        const blob = new Blob([buffer])
        form.append('data', blob, pathlib.basename(filepath))
        await fetch(`${process.env.API_URL}/file`, { method: 'POST', body: form })
          .then(handleFetchResult('text'))
          .then(r => assertEquals(r, `/file/${hash}`))
      })
    })

    await tests.step('Cleanup', async function (t) {
      await t.step('Should destroy all opened sockets', function () {
        // The code below was originally Object.values(...) but changed to .keys()
        // due to a similar flow issue to https://github.com/facebook/flow/issues/2221
        Object.keys(users).forEach((userKey) => {
          users[userKey].socket && users[userKey].socket.destroy()
        })
      })
    })
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

// Potentially useful for dealing with fetch API:
// function streamToPromise (stream, dataHandler) {
//   return new Promise((resolve, reject) => {
//     stream.on('data', (...args) => {
//       try { dataHandler(...args) } catch (err) { reject(err) }
//     })
//     stream.on('end', resolve)
//     stream.on('error', reject)
//   })
// }
// see: https://github.com/bitinn/node-fetch/blob/master/test/test.js
// This used to be in the 'Should get mailbox info for Bob' test, before the
// server manually created a JSON array out of the objects being streamed.
// await streamToPromise(res.body, chunk => {
//   console.log(bold.red('CHUNK:'), chunk.toString())
//   events.push(JSON.parse(chunk.toString()))
// })
