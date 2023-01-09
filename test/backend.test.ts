import { assertEquals, assertMatch, unreachable } from 'asserts'
import { bold, red, yellow } from 'fmt/colors.ts'
import * as pathlib from 'path'

import '~/scripts/process-shim.ts'

import sbp from '@sbp/sbp'
import '@sbp/okturtles.events'
import '@sbp/okturtles.eventqueue'

import applyPortShift from '~/scripts/applyPortShift.ts'
// eslint-disable-next-line import/no-duplicates
import '~/shared/domains/chelonia/chelonia.ts'
// eslint-disable-next-line import/no-duplicates
import { type CheloniaState, type GIMessage } from '~/shared/domains/chelonia/chelonia.ts'
import { type GIOpActionUnencrypted } from '~/shared/domains/chelonia/GIMessage.ts'
import { blake32Hash } from '~/shared/functions.ts'
import { type PubsubClient } from '~/shared/pubsub.ts'

import * as Common from '@common/common.js'
import {
  createInvite,
  proposals,
  INVITE_INITIAL_CREATOR,
  INVITE_EXPIRES_IN_DAYS,
  PAYMENT_PENDING,
  PAYMENT_TYPE_MANUAL,
  PROPOSAL_INVITE_MEMBER,
  PROPOSAL_REMOVE_MEMBER,
  PROPOSAL_GROUP_SETTING_CHANGE,
  PROPOSAL_PROPOSAL_SETTING_CHANGE,
  PROPOSAL_GENERIC
} from '@test-contracts/shared.js'

import '~/frontend/controller/namespace.js'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'
import manifests from '~/frontend/model/contracts/manifests.json' assert { type: 'json' }
import { THEME_LIGHT } from '~/frontend/model/settings/themes.js'

import packageJSON from '~/package.json' assert { type: 'json' }

type TestUser = GIMessage & { mailbox: GIMessage; socket: PubsubClient }

declare const process: {
  env: Record<string, string>
}

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

Object.assign(process.env, applyPortShift(process.env))

Deno.env.set('GI_VERSION', `${version}@${new Date().toISOString()}`)

const GI_VERSION = Deno.env.get('GI_VERSION')
const NODE_ENV = Deno.env.get('NODE_ENV') ?? 'development'

console.info('GI_VERSION:', GI_VERSION)
console.info('NODE_ENV:', NODE_ENV)

const vuexState: CheloniaState = {
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
  'backend.tests/postEntry': async function (entry: GIMessage) {
    console.log(bold(yellow('sending entry with hash:')), entry.hash())
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
    const users: Record<string, TestUser> = {}
    const groups: Record<string, GIMessage> = {}

    // Wait for the server to be ready.
    const t0 = Date.now()
    const timeout = 30000
    await new Promise((resolve, reject) => {
      (function ping () {
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

    function login (user: GIMessage) {
      // we set this so that the metadata on subsequent messages is properly filled in
      // currently group and mailbox contracts use this to determine message sender
      vuexState.loggedIn = {
        username: decryptedValue(user).data.attributes.username,
        identityContractID: user.contractID()
      }
    }

    async function createIdentity (username: string, email: string, testFn?: ((msg: GIMessage) => boolean)) {
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
          prepublish: (message: GIMessage) => { message.decryptedValue(JSON.parse) },
          postpublish: (message: GIMessage) => { testFn && testFn(message) }
        }
      })
      return msg
    }
    function createGroup (name: string, hooks: Record<string, unknown> = {}): Promise<GIMessage> {
      const initialInvite = createInvite({
        quantity: 60,
        creator: INVITE_INITIAL_CREATOR,
        expires: INVITE_EXPIRES_IN_DAYS.ON_BOARDING,
        invitee: undefined
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
    function createPaymentTo (to: GIMessage, amount: number, contractID: string, currency = 'USD'): Promise<GIMessage> {
      return sbp('chelonia/out/actionEncrypted', {
        action: 'gi.contracts/group/payment',
        data: {
          toUser: decryptedValue(to).data.attributes.username,
          amount: amount,
          currency: currency,
          txid: String(Math.floor(Math.random() * 10000000)),
          status: PAYMENT_PENDING,
          paymentType: PAYMENT_TYPE_MANUAL
        },
        contractID
      })
    }

    async function createMailboxFor (user: TestUser): Promise<GIMessage> {
      const { username } = decryptedValue(users.bob).data.attributes
      const mailbox = await sbp('chelonia/out/registerContract', {
        contractName: 'gi.contracts/mailbox',
        data: { username }
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

    function decryptedValue (msg: GIMessage): GIOpActionUnencrypted {
      return msg.decryptedValue() as GIOpActionUnencrypted
    }

    await tests.step('Identity tests', async function (t) {
      await t.step('Should create identity contracts for Alice and Bob', async function () {
        users.bob = await createIdentity('bob', 'bob@okturtles.com')
        users.alice = await createIdentity('alice', 'alice@okturtles.org')
        // verify attribute creation and state initialization
        assertMatch(decryptedValue(users.bob).data.attributes.username, /^bob/)
        assertEquals(decryptedValue(users.bob).data.attributes.email, 'bob@okturtles.com')
      })

      await t.step('Should register Alice and Bob in the namespace', async function () {
        const { alice, bob } = users
        let res = await sbp('namespace/register', decryptedValue(alice).data.attributes.username, alice.contractID())
        // NOTE: don't rely on the return values for 'namespace/register'
        //       too much... in the future we might remove these checks
        assertEquals(res.value, alice.contractID())
        res = await sbp('namespace/register', decryptedValue(bob).data.attributes.username, bob.contractID())
        assertEquals(res.value, bob.contractID())
        // @ts-expect-error  Argument of type 'string' is not assignable to parameter of type 'PubsubClient'.
        alice.socket = 'hello'
        // @ts-expect-error  Argument of type 'string' is not assignable to parameter of type 'PubsubClient'.
        assertEquals(alice.socket, 'hello')
      })

      await t.step('Should verify namespace lookups work', async function () {
        const { alice } = users
        const username = decryptedValue(alice).data.attributes.username
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
        const bobsName = decryptedValue(bob).data.attributes.username
        const bobsContractId = await sbp('namespace/lookup', bobsName)
        assertEquals(bobsContractId, bob.contractID())
        // 2. fetch all events for his identity contract to get latest state for it
        const state = await sbp('chelonia/latestContractState', bobsContractId)
        console.log(bold(red('FINAL STATE:')), state)
        // 3. get bob's mailbox contractID from his identity contract attributes
        assertEquals(state.attributes.mailbox, bob.mailbox.contractID())
        // 4. fetch the latest hash for bob's mailbox.
        //    we don't need latest state for it just latest hash
        const res = await sbp('chelonia/out/latestHash', state.attributes.mailbox)
        assertEquals(res, bob.mailbox.hash())
      })

      await t.step('Should post an event', async function () {
        await createPaymentTo(users.bob, 100, groups.group1.contractID())
      })

      await t.step('Should sync group and verify payments in state', async function () {
        await sbp('chelonia/contract/sync', groups.group1.contractID())
        // @ts-expect-error TS2571 [ERROR]: Object is of type 'unknown'.
        assertEquals(Object.keys(vuexState[groups.group1.contractID()].payments).length, 1)
      })

      await t.step('Should fail with wrong contractID', async function () {
        try {
          await createPaymentTo(users.bob, 100, '')
          unreachable()
        } catch {
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
  sanitizeOps: false
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
