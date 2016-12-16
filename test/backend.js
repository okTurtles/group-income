/* eslint-env mocha */

import _ from 'lodash-es'
import {EVENT_TYPE} from '../shared/constants'
import {makeEntry, toHash} from '../shared/functions'

const request = require('superagent')
const should = require('should') // eslint-disable-line
const nacl = require('tweetnacl')
const Primus = require('../frontend/simple/js/primus')

const Promise = global.Promise = require('bluebird')

const {API_URL: API} = process.env
const {SUCCESS} = EVENT_TYPE

var b642buf = b64 => Buffer.from(b64, 'base64')
var buf2b64 = buf => Buffer.from(buf).toString('base64')
var str2buf = str => Buffer.from(str, 'utf8')
var str2b64 = str => str2buf(str).toString('base64')
var ary2b64 = ary => Buffer.from(ary).toString('base64')

function sign ({publicKey, secretKey}, futz = '', msg = 'hello!') {
  return str2b64(JSON.stringify({
    msg: msg + futz,
    key: publicKey,
    sig: ary2b64(nacl.sign.detached(str2buf(msg), b642buf(secretKey)))
  }))
}
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
  var groupId, entry, hash
  var sockets = []

  function createSocket (done) {
    var num = sockets.length
    var primus = new Primus(process.env.API_URL, {
      timeout: 3000,
      strategy: false // don't reconnect
    })
    primus.on('open', done)
    primus.on('error', err => done(err))
    primus.on('data', msg => {
      if (msg.data && msg.data.entry) {
        console.log(`[test] primus[${num}] entry data:`, msg.data.entry.data)
      } else {
        console.log(`[test] primus[${num}] event:`, msg)
      }
    })
    sockets.push(primus)
  }

  function joinRoom (socket, room, done) {
    socket.writeAndWait({action: 'join', room}, function (response) {
      done(response.event === SUCCESS ? null : response)
    })
  }

  function postEvent (event, id) {
    entry.data = event
    entry.parentHash = hash
    hash = toHash(entry)
    return request.post(`${API}/event/${id || groupId}`)
      .set('Authorization', `gi ${signatures[0]}`)
      .send({hash, entry})
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
    entry = makeEntry({hello: 'world!', pubkey: 'foobarbaz'})
    groupId = hash = toHash(entry)

    it('Should create a group', async function () {
      var res = await request.post(`${API}/group`).send({hash, entry})
      res.body.data.hash.should.equal(groupId)
    })
  })

  describe('Pubsub tests', function () {
    it('Should join group room', function (done) {
      joinRoom(sockets[0], groupId, done)
    })

    it('Should post an event', async function () {
      var res = await postEvent({new: 'data'})
      res.body.event.should.equal(SUCCESS)
    })

    it('Should fail with wrong parentHash', function () {
      entry.parentHash = null
      return request.post(`${API}/event/${groupId}`)
        .set('Authorization', `gi ${signatures[0]}`)
        .send({hash: toHash(entry), entry})
        .should.be.rejected()
    })

    it('Should join another member', function (done) {
      createSocket(() => joinRoom(sockets[1], groupId, done))
    })

    // TODO: these event, as well as all messages sent over the sockets
    //       should all be authenticated and identified by the user's
    //       identity contract
    it('Should post another event', async function () {
      var res = await postEvent({newer: 'data2'})
      res.body.event.should.equal(SUCCESS)
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
