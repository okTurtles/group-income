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
  var contractId: string, entry: HashableEntry
  var sockets = []
  var users = {}

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
      attributes: [
        {name: 'name', value: name},
        {name: 'email', value: email}
      ]
    })
  }

  function postEntry (entry, group) {
    if (!group) group = contractId
    console.log(bold.yellow('sending entry with hash:'), entry.toHash())
    return request.post(`${API}/event/${group}`)
      .set('Authorization', `gi ${signatures[0]}`)
      .send({hash: entry.toHash(), entry: entry.toObject()})
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
      should.not.exist(bob.state)
      alice.initStateFromData()
      bob.initStateFromData()
      alice.state.attributes.name.should.equal('Alice')
      bob.state.attributes.email.should.equal('bob@okturtles.com')
      // send them off!
      var res = await postEntry(alice, alice.toHash())
      res.body.data.hash.should.equal(alice.toHash())
      res = await postEntry(bob, bob.toHash())
      res.body.data.hash.should.equal(bob.toHash())
    })

    it('Should register Alice and Bob in the namespace', async function () {
      const {alice, bob} = users
      var res = await request.post(`${process.env.API_URL}/name`)
        .send({name: alice.state.attributes.name, value: alice.toHash()})
      res.body.type.should.equal(SUCCESS)
      res = await request.post(`${process.env.API_URL}/name`)
        .send({name: bob.state.attributes.name, value: bob.toHash()})
      res.body.type.should.equal(SUCCESS)
    })

    it('Should verify namespace lookups work', async function () {
      const {alice} = users
      var res = await request.get(`${process.env.API_URL}/name/${alice.state.attributes.name}`)
      res.body.data.value.should.equal(alice.toHash())
      request.get(`${process.env.API_URL}/name/susan`).should.be.rejected()
    })

    it.skip('Should add attestation from Bob to Alice', function () {
    })

    it.skip('Alice should fail to invite Bob to non-existant group', function () {
    })
  })

  describe('Group Setup', function () {
    it('Should create a group', async function () {
      entry = new Events.GroupContract({hello: 'world!', pubkey: 'foobarbaz'})
      contractId = entry.toHash()
      var res = await postEntry(entry)
      res.body.data.hash.should.equal(contractId)
    })
  })

  describe('Pubsub tests', function () {
    it('Should join group room', function () {
      return sockets[0].sub(contractId)
    })

    it('Should post an event', async function () {
      entry = new Events.Payment({payment: 'data'}, entry.toHash())
      var res = await postEntry(entry)
      res.body.type.should.equal(SUCCESS)
    })

    it('Should fail with wrong parentHash', function () {
      let bad = entry.toObject()
      bad = new Events[bad.type](bad.data, '')
      return postEntry(bad).should.be.rejected()
    })

    it('Should join another member', function (done) {
      createSocket(err => {
        err
        ? done(err)
        : sockets[1].sub(contractId).then(() => done()).catch(done)
      })
    })

    // TODO: these events, as well as all messages sent over the sockets
    //       should all be authenticated and identified by the user's
    //       identity contract
    it('Should post another event', async function () {
      entry = new Events.Vote({vote: 'data2'}, entry.toHash())
      var res = await postEntry(entry)
      res.body.type.should.equal(SUCCESS)
      // delay so that the sockets receive notification
      return Promise.delay(200)
    })
  })
})
