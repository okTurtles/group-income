/* eslint-env mocha */

const Promise = global.Promise = require('bluebird')

import chalk from 'chalk'
import _ from 'lodash'
import {RESPONSE_TYPE} from '../shared/constants'
import {sign} from '../shared/functions'
import * as Events from '../shared/events'
import pubsub from '../frontend/simple/js/pubsub'

const request = require('superagent')
const should = require('should') // eslint-disable-line
const nacl = require('tweetnacl')

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
  var sockets = []
  var users = {}
  var groups = {}
  var recentHash = {}

  function latestHash (contract) {
    return recentHash[contract.toHash()]
  }
  function createSocket (done) {
    var num = sockets.length
    var primus = pubsub({
      url: API,
      options: {timeout: 3000, strategy: false},
      handlers: {
        open: done,
        error: err => done(err),
        data: msg => console.log(bold(`[test] ONDATA primus[${num}] msg:`), msg)
      }
    })
    sockets.push(primus)
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
    await postEntry(mailbox)
    await postEntry(
      new Events.SetAttribute({attribute: {
        name: 'mailbox', value: mailbox.toHash()
      }}, latestHash(user)),
      user
    )
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
    return require('../backend/index.js')
  })

  it('Should open websocket connection', function (done) {
    createSocket(done)
  })

  after(function () {
    for (let primus of sockets) {
      primus.destroy({timeout: 500})
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
      var res = await request.post(`${process.env.API_URL}/name`)
        .send({name: alice.data.attributes[0].value, value: alice.toHash()})
      res.body.type.should.equal(SUCCESS)
      res = await request.post(`${process.env.API_URL}/name`)
        .send({name: bob.data.attributes[0].value, value: bob.toHash()})
      res.body.type.should.equal(SUCCESS)
    })

    it('Should verify namespace lookups work', async function () {
      const {alice} = users
      var res = await request.get(`${process.env.API_URL}/name/${alice.data.attributes[0].value}`)
      res.body.data.value.should.equal(alice.toHash())
      request.get(`${process.env.API_URL}/name/susan`).should.be.rejected()
    })

    it('Should create mailboxes for Alice and Bob', async function () {
      // Object.values(users).forEach(async user => await createMailboxFor(user))
      await createMailboxFor(users.alice)
      await createMailboxFor(users.bob)
    })
    // TODO: handle incoming pubsub events from server and update contracts accordingly

    it.skip('Should add attestation from Bob to Alice', function () {
    })

    it.skip('Alice should fail to invite Bob to non-existant group', function () {
    })
  })

  describe('Group Setup', function () {
    it('Should create a group', async function () {
      groups.group1 = createGroup('group1')
      await postEntry(groups.group1)
    })
  })

  describe('Pubsub tests', function () {
    it('Should join group room', function () {
      return sockets[0].sub(groups.group1.toHash())
    })

    it('Should post an event', function () {
      return postEntry(
        new Events.Payment({payment: '123'}, latestHash(groups.group1)),
        groups.group1
      )
    })

    it('Should fail with wrong parentHash', function () {
      return postEntry(
        new Events.Payment({payment: 'abc'}, ''),
        groups.group1
      ).should.be.rejected()
    })

    it('Should join another member', function (done) {
      createSocket(err => {
        err
        ? done(err)
        : sockets[1].sub(groups.group1.toHash()).then(() => done()).catch(done)
      })
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
