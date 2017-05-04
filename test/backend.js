/* eslint-env mocha */

const Promise = global.Promise = require('bluebird')

import Vue from 'vue'
import chalk from 'chalk'
import _ from 'lodash'
import {RESPONSE_TYPE} from '../shared/constants'
import {sign} from '../shared/functions'
import * as Events from '../shared/events'
import pubsub from '../frontend/simple/js/pubsub'

const request = require('superagent')
const fetch = require('node-fetch') // TODO: switch from request to fetch API fully, see NOTE below
const should = require('should') // eslint-disable-line
const nacl = require('tweetnacl')
const stream = require('stream')

// NOTE: fetch API docs:
// https://github.com/bitinn/node-fetch
// https://jakearchibald.com/2015/thats-so-fetch/
// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
// https://github.com/github/fetch

const {HashableEntry} = Events
const {API_URL: API} = process.env
const {SUCCESS} = RESPONSE_TYPE

chalk.enabled = true // for some reason it's not detecting that terminal supports colors
const {bold} = chalk
console.log(bold('COLORS SUPPORTED?'), chalk.supportsColor)

var buf2b64 = buf => Buffer.from(buf).toString('base64')
var personas = _.times(3, () => nacl.sign.keyPair()).map(x => _.mapValues(x, buf2b64))
var signatures = personas.map(x => sign(x))
// var unsignedMsg = sign(personas[0], 'futz')

// TODO: replay attacks? (need server-provided challenge for `msg`?)
//       nah, this should be taken care of by TLS. However, for message
//       passing we should be using a forward-secure protocol. See
//       MessageRelay in interface.js.

// TODO: the request for members of a group should be made with a group
//       key or a group signature. There should not be a mapping of a
//       member's key to all the groups that they're in (that's unweildy
//       and compromises privacy).

describe('Full walkthrough', function () {
  const events = new Vue()
  var users = {}
  var groups = {}
  var recentHash = {}

  function latestHash (contract) {
    return recentHash[contract.toHash()]
  }
  function createSocket () {
    return new Promise((resolve, reject) => {
      var primus = pubsub({
        url: API,
        options: {timeout: 3000, strategy: false},
        handlers: {
          open: () => resolve(primus),
          error: err => reject(err),
          data: msg => {
            console.log(bold(`[test] ONDATA msg:`), msg)
            events.$emit(msg.data.hash, msg.data)
          }
        }
      })
    })
  }

  function createIdentity (name, email) {
    return new Events.IdentityContract({
      authorizations: [Events.CanModifyAuths.dummyAuth(name)],
      attributes: [
        {name: 'name', value: name},
        {name: 'email', value: email}
      ]
    })
  }
  function createGroup (name, data) {
    return new Events.GroupContract({
      authorizations: [Events.CanModifyAuths.dummyAuth(name)],
      groupName: name,
      ...data
    })
  }

  async function createMailboxFor (user) {
    var mailbox = new Events.MailboxContract({
      authorizations: [Events.CanModifyAuths.dummyAuth(user.toHash())]
    })
    await user.socket.sub(mailbox.toHash())
    await postEntry(mailbox)
    await postEntry(
      new Events.SetAttribute({attribute: {
        name: 'mailbox', value: mailbox.toHash()
      }}, latestHash(user)),
      user
    )
    user.mailbox = mailbox
  }

  async function postEntry (entry, contractId) {
    if (!contractId) {
      contractId = entry.toHash()
    } else if (contractId instanceof HashableEntry) {
      contractId = contractId.toHash()
    }
    console.log(bold.yellow('sending entry with hash:'), entry.toHash())
    var res = await request.post(`${API}/event/${contractId}`)
      .set('Authorization', `gi ${signatures[0]}`)
      .send({hash: entry.toHash(), entry: entry.toObject()})
    res.body.type.should.equal(SUCCESS)
    res.body.data.hash.should.equal(entry.toHash())
    recentHash[contractId] = entry.toHash()
    return res
  }

  it('Should start the server', function () {
    this.timeout(10000)
    return require('../backend/index.js')
  })

  after(function () {
    for (let user of Object.values(users)) {
      user.socket && user.socket.destroy({timeout: 500})
    }
  })

  describe('Identity tests', function () {
    it('Should create identity contracts for Alice and Bob', async function () {
      users.bob = createIdentity('Bob', 'bob@okturtles.com')
      users.alice = createIdentity('Alice', 'alice@okturtles.org')
      const {alice, bob} = users
      // verify attribute creation and state initialization
      bob.data.attributes[0].value.should.equal('Bob')
      bob.data.attributes[1].value.should.equal('bob@okturtles.com')
      // send them off!
      var res = await postEntry(alice)
      res.body.data.hash.should.equal(alice.toHash())
      res = await postEntry(bob)
      res.body.data.hash.should.equal(bob.toHash())
    })

    it('Should register Alice and Bob in the namespace', async function () {
      const {alice, bob} = users
      var res = await request.post(`${API}/name`)
        .send({name: alice.data.attributes[0].value, value: alice.toHash()})
      res.body.type.should.equal(SUCCESS)
      res = await request.post(`${API}/name`)
        .send({name: bob.data.attributes[0].value, value: bob.toHash()})
      res.body.type.should.equal(SUCCESS)
      alice.socket = 'hello'
      should(alice.socket).equal('hello')
    })

    it('Should verify namespace lookups work', async function () {
      const {alice} = users
      var res = await request.get(`${API}/name/${alice.data.attributes[0].value}`)
      res.body.data.value.should.equal(alice.toHash())
      request.get(`${API}/name/susan`).should.be.rejected()
    })

    it('Should open sockets for Alice and Bob', async function () {
      for (let user of Object.values(users)) {
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
      groups.group1 = createGroup('group1')
      await users.alice.socket.sub(groups.group1.toHash())
      await postEntry(groups.group1)
    })

    // NOTE: The frontend needs to use the `fetch` API instead of superagent because
    //       superagent doesn't support streaming, whereas fetch does.
    // TODO: We should also remove superagent as a dependency since `fetch` does
    //       everything we need. Use fetch from now on.
    it('Should get mailbox info for Bob', async function () {
      // 1. look up bob's username to get his identity contract
      const {bob} = users
      const bobsName = bob.data.attributes[0].value
      var res = await request.get(`${API}/name/${bobsName}`)
      const bobsContractId = res.body.data.value
      should(bobsContractId).equal(bob.toHash())
      // 2. fetch all events for his identity contract to get latest state for it
      res = await fetch(`${API}/events/${bobsContractId}/${bobsContractId}`)
      should(res.body).be.an.instanceof(stream.Transform)
      var events = await res.json()
      console.log(bold.red('EVENTS:'), events)
      // NOTE: even though we could avoid creating instances out of these events,
      //       we do it anyways even in these tests just to remind the reader
      //       that .fromObject must be called on the input data, so that the
      //       hash-based ingrity check is done.
      // Illustraiting its importance: when converting the code below from
      // raw-objects to instances, the hash check failed and I caught several bugs!
      var [contract, ...actions] = events.map(e => {
        return Events[e.entry.type].fromObject(e.entry, e.hash)
      })
      var state = contract.toVuexState()
      actions.forEach(action => {
        let type = action.constructor.name
        contract.constructor.vuex.mutations[type](state, {data: action.data, hash: action.hash})
      })
      console.log(bold.red('FINAL STATE:'), state)
      // 3. get bob's mailbox contractId from his identity contract attributes
      should(state.attributes.mailbox).equal(bob.mailbox.toHash())
      // 4. fetch the latest hash for bob's mailbox.
      //    we don't need latest state for it just latest hash
      res = await fetch(`${API}/latestHash/${state.attributes.mailbox}`).then(r => r.json())
      should(res.data.hash).equal(latestHash(bob.mailbox))
    })

    it("Should invite Bob to Alice's group", function (done) {
      var mailbox = users.bob.mailbox
      var invite = new Events.PostMessage({messageType: Events.PostMessage.TypeInvite, message: groups.group1.toHash()}, latestHash(mailbox))
      events.$once(invite.toHash(), ({contractId, hash, entry}) => {
        console.log('Bob successfully got invite!', entry)
        should(entry.data.message).equal(groups.group1.toHash())
        done()
      })
      postEntry(invite, mailbox.toHash())
    })

    it('Should post an event', function () {
      return postEntry(
        new Events.Payment({payment: '123'}, latestHash(groups.group1)),
        groups.group1
      )
    })

    it('Should fail with wrong parentHash', function () {
      return should(postEntry(
        new Events.Payment({payment: 'abc'}, ''),
        groups.group1
      )).be.rejected()
    })

    // TODO: these events, as well as all messages sent over the sockets
    //       should all be authenticated and identified by the user's
    //       identity contract
    it('Should post another event', async function () {
      await postEntry(
        new Events.Vote({vote: 'data2'}, latestHash(groups.group1)),
        groups.group1
      )
      // delay so that the sockets receive notification
      return Promise.delay(200)
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
