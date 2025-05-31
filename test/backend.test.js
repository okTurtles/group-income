/* eslint-env mocha */

import * as Common from '@common/common.js'
import '@sbp/okturtles.eventqueue'
import '@sbp/okturtles.events'
import sbp from '@sbp/sbp'
import chalk from 'chalk'
import '~/frontend/controller/serviceworkers/sw-namespace.js'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'
import manifests from '~/frontend/model/contracts/manifests.json'
import { PROFILE_STATUS, PROPOSAL_GENERIC, PROPOSAL_GROUP_SETTING_CHANGE, PROPOSAL_INVITE_MEMBER, PROPOSAL_PROPOSAL_SETTING_CHANGE, PROPOSAL_REMOVE_MEMBER } from '~/frontend/model/contracts/shared/constants.js'
import { PAYMENT_PENDING, PAYMENT_TYPE_MANUAL } from '~/frontend/model/contracts/shared/payments/index.js'
import proposals from '~/frontend/model/contracts/shared/voting/proposals.js'
import { THEME_LIGHT } from '~/frontend/model/settings/themes.js'
import 'libchelonia'
import { createCID, multicodes } from 'libchelonia/functions'
import { Secret } from 'libchelonia/Secret'
import { EDWARDS25519SHA512BATCH, keyId, keygen, serializeKey } from '@chelonia/crypto'

// Necessary since we are going to use a WebSocket pubsub client in the backend.
global.WebSocket = require('ws')
const should = require('should') // eslint-disable-line

// Remove this when dropping support for Node versions lower than v20.
const File = require('buffer').File
const fs = require('fs')
const path = require('path')
// const { PassThrough, Readable } = require('stream')

chalk.level = 2 // for some reason it's not detecting that terminal supports colors
const { bold } = chalk

// TODO: replay attacks? (need server-provided challenge for `msg`?)
//       nah, this should be taken care of by TLS. However, for message
//       passing we should be using a forward-secure protocol. See
//       MessageRelay in interface.js.

// TODO: the request for members of a group should be made with a group
//       key or a group signature. There should not be a mapping of a
//       member's key to all the groups that they're in (that's unweildy
//       and compromises privacy).

const vuexState = {
  currentGroupId: null,
  currentChatRoomIDs: {},
  contracts: {}, // contractIDs => { type:string, HEAD:string } (for contracts we've successfully subscribed to)
  loggedIn: false, // false | { username: string, identityContractID: string }
  theme: THEME_LIGHT,
  fontSize: 1,
  increasedContrast: false,
  namespaceLookups: Object.create(null),
  reverseNamespaceLookups: Object.create(null),
  reducedMotion: false,
  appLogsFilter: ['error', 'info', 'warn'],
  contractSigningKeys: Object.create(null)
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
    console.log(bold.yellow('sending entry with hash:'), entry.hash())
    const res = await sbp('chelonia/private/out/publishEvent', entry)
    should(res.id()).equal(entry.id())
    return res.hash()
  }
})

// uncomment this to help with debugging:
// sbp('sbp/filters/global/add', (domain, selector, data) => {
//   console.log(`[sbp] ${selector}:`, data)
// })

describe('Full walkthrough', function () {
  const users = {}
  const groups = {}

  it('Should configure chelonia', async function () {
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
            'controller/router',
            'chelonia/queueInvocation',
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
    const CSK = keygen(EDWARDS25519SHA512BATCH)
    const CSKid = keyId(CSK)
    const CSKp = serializeKey(CSK, false)
    const SAK = keygen(EDWARDS25519SHA512BATCH)
    const SAKid = keyId(SAK)
    const SAKp = serializeKey(SAK, false)

    sbp('chelonia/storeSecretKeys',
      new Secret([CSK, SAK].map(key => ({ key, transient: true })))
    )

    // append random id to username to prevent conflict across runs
    // when GI_PERSIST environment variable is defined
    username = `${username}-${performance.now().toFixed(20).replace('.', '')}`
    const msg = await sbp('chelonia/out/registerContract', {
      contractName: 'gi.contracts/identity',
      keys: [
        {
          id: CSKid,
          name: 'csk',
          purpose: ['sig'],
          ringLevel: 0,
          permissions: '*',
          allowedActions: '*',
          data: CSKp
        },
        {
          id: SAKid,
          name: '#sak',
          purpose: ['sak'],
          ringLevel: 0,
          permissions: [],
          allowedActions: [],
          data: SAKp
        }
      ],
      data: {
        // authorizations: [Events.CanModifyAuths.dummyAuth(name)],
        attributes: { username, email }
      },
      signingKeyId: CSKid,
      hooks: {
        // TODO when merging: decryptedValue no longer takes an argument (was decryptedValue(JSON.parse))
        prepublish: (message) => { message.decryptedValue() },
        postpublish: (message) => { testFn && testFn(message) }
      },
      namespaceRegistration: username
    })
    return msg
  }
  function createGroup (name: string, creator: any, hooks: Object = {}): Promise {
    const CSK = keygen(EDWARDS25519SHA512BATCH)
    const CSKid = keyId(CSK)
    const CSKp = serializeKey(CSK, false)

    sbp('chelonia/storeSecretKeys',
      new Secret([CSK].map(key => ({ key, transient: true })))
    )

    /* const initialInvite = createInvite({
      quantity: 60,
      creatorID: INVITE_INITIAL_CREATOR,
      expires: INVITE_EXPIRES_IN_DAYS.ON_BOARDING
    }) */
    return sbp('chelonia/out/registerContract', {
      contractName: 'gi.contracts/group',
      keys: [
        // This is the group's CSK and is used for outer signatures.
        {
          id: CSKid,
          name: 'csk',
          purpose: ['sig'],
          ringLevel: 0,
          permissions: '*',
          allowedActions: '*',
          data: CSKp
        },
        // We need to add the creator's CSK to the group in order to validate
        // inner signatures, which are part of the permissions system in the
        // group contract.
        {
          id: creator.signingKeyId(),
          name: 'creator',
          purpose: ['sig'],
          ringLevel: 1,
          permissions: '*',
          allowedActions: '*',
          data: sbp('chelonia/rootState')[creator.contractID()]._vm.authorizedKeys[creator.signingKeyId()].data,
          foreignKey: `shelter:${encodeURIComponent(creator.contractID())}?keyName=${encodeURIComponent('csk')}`
        }
      ],
      data: {
        settings: {
          // authorizations: [Events.CanModifyAuths.dummyAuth(name)],
          groupName: name,
          groupPicture: { manifestCid: '' },
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
        },
        profiles: {
          [creator.contractID()]: {
            status: PROFILE_STATUS.ACTIVE
          }
        }
      },
      signingKeyId: CSKid,
      hooks,
      publishOptions: {
        billableContractID: creator.contractID()
      }
    })
  }
  function createPaymentTo (from, to, amount, contractID, signingKeyId, currency = 'USD'): Promise {
    return sbp('chelonia/out/actionUnencrypted', {
      action: 'gi.contracts/group/payment',
      data: {
        toMemberID: to.contractID(),
        amount: amount,
        currency: currency,
        txid: String(parseInt(Math.random() * 10000000)),
        status: PAYMENT_PENDING,
        paymentType: PAYMENT_TYPE_MANUAL
      },
      contractID,
      signingKeyId,
      innerSigningKeyId: from.signingKeyId()
    })
  }

  describe('Identity tests', function () {
    it('Should create identity contracts for Alice and Bob', async function () {
      users.bob = await createIdentity('bob', 'bob@okturtles.com')
      users.alice = await createIdentity('alice', 'alice@okturtles.org')
      // verify attribute creation and state initialization
      users.bob.decryptedValue().data.attributes.username.should.match(/^bob/)
      users.bob.decryptedValue().data.attributes.email.should.equal('bob@okturtles.com')
    })

    /*
    // The following test is redundant because now namespace registration happens
    // when registering a contract instead of after it's registered using
    // 'namespace/register'. If we have no further use for 'namespace/register',
    // consider removing this entirely
    it.skip('Should register Alice and Bob in the namespace', async function () {
      const { alice, bob } = users
      let res = await sbp('namespace/register', alice.decryptedValue().data.attributes.username, alice.contractID())
      // NOTE: don't rely on the return values for 'namespace/register'
      //       too much... in the future we might remove these checks
      res.value.should.equal(alice.contractID())
      res = await sbp('namespace/register', bob.decryptedValue().data.attributes.username, bob.contractID())
      res.value.should.equal(bob.contractID())
      alice.socket = 'hello'
      should(alice.socket).equal('hello')
    })
    */

    it('Should verify namespace lookups work', async function () {
      const { alice } = users
      const res = await sbp('namespace/lookup', alice.decryptedValue().data.attributes.username)
      res.should.equal(alice.contractID())
      const contractID = await sbp('namespace/lookup', 'susan')
      should(contractID).equal(null)
    })

    it('Should open socket for Alice', async function () {
      users.alice.socket = await sbp('chelonia/connect')
    })
  })

  describe('Group tests', function () {
    it('Should create a group & subscribe Alice', async function () {
      // set user Alice as being logged in so that metadata on messages is properly set
      login(users.alice)
      groups.group1 = await createGroup('group1', users.alice)
      await sbp('chelonia/contract/retain', groups.group1.contractID())
    })

    it('Should post an event', function () {
      return createPaymentTo(users.alice, users.bob, 100, groups.group1.contractID(), groups.group1.signingKeyId())
    })

    it('Should sync group and verify payments in state', async function () {
      await sbp('chelonia/contract/retain', groups.group1.contractID())
      should(Object.keys(vuexState[groups.group1.contractID()].payments).length).equal(1)
    })

    it('Should fail with wrong contractID', async function () {
      try {
        await createPaymentTo(users.alice, users.bob, 100, '')
        return Promise.reject(new Error("shouldn't get here!"))
      } catch (e) {
        return Promise.resolve()
      }
    })

    // TODO: these events, as well as all messages sent over the sockets
    //       should all be authenticated and identified by the user's
    //       identity contract
  })

  describe('File upload', function () {
    it('Should upload "avatar-default.png" as "multipart/form-data"', async function () {
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
      const buffer = fs.readFileSync(filepath)
      const hash = createCID(buffer, multicodes.SHELTER_FILE_CHUNK)
      console.log(`hash for ${path.basename(filepath)}: ${hash}`)
      const manifest = {
        version: '1.0.0',
        type: 'image/png',
        // The file is not encrypted, but we use 'aes256gcm' anyhow because
        // the server will reject unencrypted files
        cipher: 'aes256gcm',
        'cipher-params': { 'keyId': 'ojSKsDaV' },
        size: buffer.byteLength,
        chunks: [[buffer.byteLength, hash]]
      }
      const manifestBuffer = Buffer.from(JSON.stringify(manifest))
      const manifestCid = createCID(manifestBuffer, multicodes.SHELTER_FILE_MANIFEST)
      form.append(
        '0',
        new File(
          [buffer],
          '0',
          { type: 'application/octet-stream' }
        )
      )
      form.append(
        'manifest',
        new File(
          [manifestBuffer],
          'manifest.json',
          { type: 'application/vnd.shelter.manifest' }
        )
      )
      await fetch(`${process.env.API_URL}/file`,
        {
          method: 'POST',
          headers: {
            authorization: sbp('chelonia/shelterAuthorizationHeader', users.alice.contractID())
          },
          body: form
        }
      )
        .then(handleFetchResult('text'))
        .then(r => should(r).equal(manifestCid))
    })
  })

  describe('Cleanup', function () {
    it('Should destroy all opened sockets', function () {
      // The code below was originally Object.values(...) but changed to .keys()
      // due to a similar flow issue to https://github.com/facebook/flow/issues/2221
      Object.keys(users).forEach((userKey) => {
        users[userKey].socket && users[userKey].socket.destroy()
      })
    })
  })
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
