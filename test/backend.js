/* eslint-env mocha */

const Promise = global.Promise = require('bluebird')

import chalk from 'chalk'
import _ from 'lodash-es'
import {RESPONSE_TYPE} from '../shared/constants'
import {sign} from '../shared/functions'
import {HashableEntry, Events} from '../shared/events'

const request = require('superagent')
const should = require('should') // eslint-disable-line
const nacl = require('tweetnacl')
const Primus = require('../frontend/simple/assets/vendor/primus')

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
  var groupId: string, entry: HashableEntry
  var sockets = []

  function createSocket (done) {
    var num = sockets.length
    var primus = new Primus(API, {timeout: 3000, strategy: false})
    primus.on('open', done)
    primus.on('error', err => done(err))
    primus.on('data', msg => {
      console.log(bold(`[test] ONDATA primus[${num}] msg:`), msg)
    })
    sockets.push(primus)
  }

  function joinRoom (socket, groupId, done) {
    socket.writeAndWait({action: 'sub', groupId}, function (response) {
      done(response.type === SUCCESS ? null : response)
    })
  }

  function postEntry (entry, group) {
    if (!group) group = groupId
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

  describe('Group Setup', function () {
    it('Should create a group', async function () {
      entry = new Events.Group({hello: 'world!', pubkey: 'foobarbaz'})
      groupId = entry.toHash()
      var res = await postEntry(entry)
      res.body.data.hash.should.equal(groupId)
    })
  })

  describe('Pubsub tests', function () {
    it('Should join group room', function (done) {
      joinRoom(sockets[0], groupId, done)
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
      createSocket(err => err ? done(err) : joinRoom(sockets[1], groupId, done))
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
/*
    it('Should GET (non-empty)', function (done) {
      request.get(`${API}/group/1`)
      .set('Authorization', `gi ${signatures[0]}`)
      .end(function (err, res) {
        should(err).be.null()
        res.status.should.equal(200)
        res.body.id.should.equal(1)
        res.body.name.should.equal(group1name)
        res.body.users.should.have.length(1)
        res.body.users[0].id.should.equal(personas[0].publicKey)
        done()
      })
    })
*/
  })
})
