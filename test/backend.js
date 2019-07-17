/* eslint-env mocha */

import sbp from '~/shared/sbp.js'
import '~/shared/domains/okTurtles/events.js'
import chalk from 'chalk'
import { GIMessage } from '~/shared/GIMessage.js'
import contracts from '~/frontend/model/contracts.js'
import * as _ from '~/frontend/utils/giLodash.js'
import { createWebSocket } from '~/frontend/controller/backend.js'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'
// import { blake2bInit, blake2bUpdate, blake2bFinal } from 'blakejs'
// import multihash from 'multihashes'
import { blake32Hash } from '~/shared/functions.js'
import '~/frontend/controller/namespace.js'

global.fetch = require('node-fetch')
const should = require('should') // eslint-disable-line
const FormData = require('form-data')
const fs = require('fs')
const path = require('path')
// const { PassThrough, Readable } = require('stream')

chalk.enabled = true // for some reason it's not detecting that terminal supports colors
const { bold } = chalk

// var unsignedMsg = sign(personas[0], 'futz')

// TODO: replay attacks? (need server-provided challenge for `msg`?)
//       nah, this should be taken care of by TLS. However, for message
//       passing we should be using a forward-secure protocol. See
//       MessageRelay in interface.js.

// TODO: the request for members of a group should be made with a group
//       key or a group signature. There should not be a mapping of a
//       member's key to all the groups that they're in (that's unweildy
//       and compromises privacy).

sbp('sbp/selectors/register', {
  // intercept 'handleEvent' from backend.js
  'state/vuex/dispatch': function (action, event) {
    switch (action) {
      case 'handleEvent':
        contracts[event.type()].validate(event.data())
        sbp('okTurtles.events/emit', event.hash(), event)
        break
      default: throw new Error(`unknown dispatch: ${action}`)
    }
  }
})

// uncomment this to help with debugging:
// sbp('sbp/filters/global/add', (domain, selector, data) => {
//   console.log(`[sbp] ${selector}:`, data)
// })

describe('Full walkthrough', function () {
  var users = {}
  var groups = {}

  function createSocket () {
    return createWebSocket(process.env.API_URL, { timeout: 3000, strategy: false })
  }

  function createIdentity (name, email) {
    return sbp('gi/contract/create', 'IdentityContract', {
      // authorizations: [Events.CanModifyAuths.dummyAuth(name)],
      attributes: { name, email }
    })
  }
  function createGroup (name, founder) {
    return sbp('gi/contract/create', 'GroupContract', {
      // authorizations: [Events.CanModifyAuths.dummyAuth(name)],
      groupName: name,
      groupPicture: '',
      sharedValues: 'our values',
      changeThreshold: 0.8,
      memberApprovalThreshold: 0.8,
      memberRemovalThreshold: 0.8,
      incomeProvided: 1000,
      incomeCurrency: 'USD', // TODO: grab this as a constant from currencies.js
      founderUsername: founder.data().attributes.name,
      founderIdentityContractId: founder.hash()
    })
  }
  function createPayment (from, to, amount, parentHash, currency = 'USD') {
    return sbp('gi/contract/create-action', 'GroupPayment',
      {
        fromUser: from.data().attributes.name,
        toUser: to.data().attributes.name,
        date: new Date().toISOString(),
        amount: amount,
        currency: currency,
        txid: String(parseInt(Math.random() * 10000000)),
        status: contracts.GroupPayment.StatusPending,
        paymentType: contracts.GroupPayment.TypeManual
      },
      parentHash
    )
  }

  async function createMailboxFor (user) {
    var mailbox = sbp('gi/contract/create', 'MailboxContract', {
      // authorizations: [Events.CanModifyAuths.dummyAuth(user.hash())]
    })
    await user.socket.sub(mailbox.hash())
    await postEntry(mailbox)
    await postEntry(
      await sbp('gi/contract/create-action', 'IdentitySetAttributes', {
        mailbox: mailbox.hash()
      }, user.hash())
    )
    user.mailbox = mailbox
  }

  async function postEntry (entry) {
    console.log(bold.yellow('sending entry with hash:'), entry.hash())
    var res = await sbp('backend/publishLogEntry', entry)
    should(res).equal(entry.hash())
    return res
  }

  it('Should start the server', function () {
    this.timeout(10000)
    return require('../backend/index.js')
  })

  after(function () {
    // The code below was originally Object.values(...) but changed to .keys()
    // due to a similar flow issue to https://github.com/facebook/flow/issues/2221
    Object.keys(users).forEach((userKey) => {
      users[userKey].socket && users[userKey].socket.destroy({ timeout: 500 })
    });
  })

  describe('Identity tests', function () {
    it('Should create identity contracts for Alice and Bob', async function () {
      users.bob = createIdentity('Bob', 'bob@okturtles.com')
      users.alice = createIdentity('Alice', 'alice@okturtles.org')
      const { alice, bob } = users
      // verify attribute creation and state initialization
      bob.data().attributes.name.should.equal('Bob')
      bob.data().attributes.email.should.equal('bob@okturtles.com')
      // send them off!
      await postEntry(alice)
      await postEntry(bob)
    })

    it('Should register Alice and Bob in the namespace', async function () {
      const { alice, bob } = users
      var res = await sbp('namespace/register', alice.data().attributes.name, alice.hash())
      res.value.should.equal(alice.hash())
      res = await sbp('namespace/register', bob.data().attributes.name, bob.hash())
      res.value.should.equal(bob.hash())
      alice.socket = 'hello'
      should(alice.socket).equal('hello')
    })

    it('Should verify namespace lookups work', async function () {
      const { alice } = users
      var res = await sbp('namespace/lookup', alice.data().attributes.name)
      res.should.equal(alice.hash())
      sbp('namespace/lookup', 'susan').should.be.rejected()
    })

    it('Should open sockets for Alice and Bob', async function () {
      // The code below was originally Object.values(...) but changed to .keys()
      // due to a similar flow issue to https://github.com/facebook/flow/issues/2221
      const userList = Object.keys(users).map((userKey) => users[userKey])
      for (let user of userList) {
        user.socket = await createSocket()
      }
    })

    it('Should create mailboxes for Alice and Bob and subscribe', async function () {
      // Object.values(users).forEach(async user => await createMailboxFor(user))
      await createMailboxFor(users.alice)
      await createMailboxFor(users.bob)
    })
  })

  describe('Group tests', function () {
    it('Should create a group & subscribe Alice', async function () {
      groups.group1 = createGroup('group1', users.alice)
      await users.alice.socket.sub(groups.group1.hash())
      await postEntry(groups.group1)
    })

    // NOTE: The frontend needs to use the `fetch` API instead of superagent because
    //       superagent doesn't support streaming, whereas fetch does.
    // TODO: We should also remove superagent as a dependency since `fetch` does
    //       everything we need. Use fetch from now on.
    it('Should get mailbox info for Bob', async function () {
      // 1. look up bob's username to get his identity contract
      const { bob } = users
      const bobsName = bob.data().attributes.name
      const bobsContractId = await sbp('namespace/lookup', bobsName)
      should(bobsContractId).equal(bob.hash())
      // 2. fetch all events for his identity contract to get latest state for it
      var events = await sbp('backend/eventsSince', bobsContractId, bobsContractId)
      should(events).be.an.instanceof(Array)
      console.log(bold.red('EVENTS:'), events)
      // NOTE: even though we could avoid creating instances out of these events,
      //       we do it anyways even in these tests just to remind the reader
      //       that .fromObject must be called on the input data, so that the
      //       hash-based ingrity check is done.
      // Illustraiting its importance: when converting the code below from
      // raw-objects to instances, the hash check failed and I caught several bugs!
      events = events.map(e => GIMessage.deserialize(e))
      let contract = contracts[events[0].type()]
      var state = _.cloneDeep(contract.vuexModule.state)
      for (let e of events) {
        contract.vuexModule.mutations[e.type()](state, {
          data: e.data(),
          hash: e.hash()
        })
      }
      console.log(bold.red('FINAL STATE:'), state)
      // 3. get bob's mailbox contractID from his identity contract attributes
      should(state.attributes.mailbox).equal(bob.mailbox.hash())
      // 4. fetch the latest hash for bob's mailbox.
      //    we don't need latest state for it just latest hash
      const res = await sbp('backend/latestHash', state.attributes.mailbox)
      should(res).equal(bob.mailbox.hash())
    })

    it("Should invite Bob to Alice's group", function (done) {
      var mailbox = users.bob.mailbox
      sbp('gi/contract/create-action', 'MailboxPostMessage',
        {
          from: users.bob.data().attributes.name,
          messageType: contracts.MailboxPostMessage.TypeInvite,
          message: groups.group1.hash(),
          sentDate: new Date().toISOString()
        },
        mailbox.hash()
      ).then(invite => {
        sbp('okTurtles.events/once', invite.hash(), (entry: GIMessage) => {
          console.log('Bob successfully got invite!')
          should(entry.data().message).equal(groups.group1.hash())
          done()
        })
        postEntry(invite)
      })
    })

    it('Should post an event', async function () {
      await postEntry(await createPayment(users.bob, users.alice, 100, groups.group1.hash()))
    })

    it('Should fail with wrong parentHash', async function () {
      try {
        var p = await createPayment(users.alice, users.bob, 100, '')
        await postEntry(p)
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
    it('Should upload "default-avatar.png" as "multipart/form-data"', async function () {
      const form = new FormData()
      const filepath = './frontend/assets/images/default-avatar.png'
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
      const hash = blake32Hash(buffer)
      console.log(`hash for ${path.basename(filepath)}: ${hash}`)
      form.append('hash', hash)
      form.append('data', buffer, {
        filename: 'a file name hack' // hack to make sure the contentDisposition header is set
                                     // otherwise the backend will treat 'data' as a string
                                     // instead of a buffer for some reason, resulting in the
                                     // wrong file hash.
                                     // The filename is ignored by the backend so it doesn't
                                     // matter what we call it.
      })
      await fetch(`${process.env.API_URL}/file`, { method: 'POST', body: form })
      .then(handleFetchResult('text'))
      .then(r => should(r).equal(hash))
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
