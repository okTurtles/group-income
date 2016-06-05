/* eslint-env mocha */

// http://stackoverflow.com/a/36044758/1781435
// ignore everything in node_modules except lodash-es
require('babel-register')({ignore: /node_modules\/(?!lodash-es)/})
const _ = require('lodash-es')
const request = require('superagent')
const should = require('should')
const nacl = require('tweetnacl')
const PORT = process.env.API_PORT

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
var unsignedMsg = sign(personas[0], 'futz')

// TODO: replay attacks? (need server-provided challenge for `msg`?)
//       nah, this should be taken care of by TLS. However, for message
//       passing we should be using a forward-secure protocol. See
//       MessageRelay in interface.js.

// TODO: the request for members of a group should be made with a group
//       key or a group signature. There should not be a mapping of a
//       member's key to all the groups that they're in (that's unweildy
//       and compromises privacy).

describe('Full walkthrough', function () {
  it('Should start the server', function () {
    return require('../backend/index.js')
  })

  describe('User', function () {
    it('Should GET (empty)', function () {
      return request.get(`http://localhost:${PORT}/user/`)
      .set('Authorization', `gi ${signatures[0]}`)
      .should.be.rejectedWith({status: 404})
    })

    it('Should POST', async function () {
      var res = await request.post(`http://localhost:${PORT}/user/`)
      .send({name: 'hi hello', password: 'baconbaconbacon', email: 'bob@test.com', phone: '12345667', contriGL: 5, contriRL: 7})
      .set('Authorization', `gi ${signatures[0]}`)
      res.status.should.equal(200)
    })

    it('Should GET (non-empty)', async function () {
      var res = await request.get(`http://localhost:${PORT}/user/`)
      .set('Authorization', `gi ${signatures[0]}`)
      res.status.should.equal(200)
      res.body.id.should.equal(personas[0].publicKey)
      res.body.name.should.equal('hi hello')
      res.body.email.should.equal('bob@test.com')
      res.body.phone.should.equal('12345667')
      res.body.contriGL.should.equal(5)
      res.body.contriRL.should.equal(7)
    })

    it('Should POST (2)', async function () {
      var res = await request.post(`http://localhost:${PORT}/user/`)
      .send({name: 'User number two', password: 'baconbaconbacon', email: 'jack@test.com', phone: '959040392', contriGL: 2, contriRL: 99})
      .set('Authorization', `gi ${signatures[1]}`)
      res.status.should.equal(200)
    })

    it('Should POST (3)', async function () {
      var res = await request.post(`http://localhost:${PORT}/user/`)
      .send({name: 'User number three', password: 'baconbaconbacon', email: 'john@test.com', phone: '6478392654', contriGL: 20, contriRL: 1})
      .set('Authorization', `gi ${signatures[2]}`)
      res.status.should.equal(200)
    })
  })

  describe('Group', function () {
    var group1name = 'my super group'

    it('Should GET (no cookie)', function () {
      return request.get(`http://localhost:${PORT}/group/1`) // This 'return' is important
      .should.be.rejectedWith({status: 401})
    })

    it('Should POST', async function () {
      var res = await request.post(`http://localhost:${PORT}/group/`)
      .set('Authorization', `gi ${signatures[0]}`)
      .send({name: group1name})
      res.status.should.equal(200)
      res.body.group.should.not.be.null()
    })

    it('Should GET (non-empty)', function (done) {
      request.get(`http://localhost:${PORT}/group/1`)
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

    it("Shouldn't GET (unauthorized)", function () {
      return request.get(`http://localhost:${PORT}/group/1`)
      .set('Authorization', `gi ${signatures[1]}`)
      .should.be.rejectedWith({status: 404})
    })

    it('Should be unauthorized to load a group', function () {
      return request.get(`http://localhost:${PORT}/group/1`)
      .set('Authorization', `gi ${unsignedMsg}`)
      .should.be.rejectedWith({status: 401})
    })
  })

  describe('Invite', function () {
    it('Should refuse to invite if not part of the group', function (done) {
      request.post(`http://localhost:${PORT}/invite/`)
      .set('Authorization', `gi ${signatures[2]}`)
      .send({groupId: 1, email: 'invited@test.com'})
      .end(function (err, res) {
        err.should.not.equal(null)
        res.status.should.equal(401)
        res.text.length.should.be.greaterThan(0)
        done()
      })
    })

    // TODO: skipping these. See the "TODO" within backend/invite.js
    it.skip('Should create an invitation and send an email', function (done) {
      request.post(`http://localhost:${PORT}/invite/`)
      .set('Authorization', `gi ${signatures[0]}`)
      .send({groupId: 1, email: 'invited@test.com'})
      .end(function (err, res) {
        should(err).be.null()
        res.status.should.equal(200)
        res.body.link.length.should.be.greaterThan(0)

        request.post(res.body.link)
        .redirects(0)
        .end(function (err, res) {
          err.should.not.equal(null)
          res.status.should.equal(302)
          res.text.length.should.be.greaterThan(0)
          done()
        })
      })
    })

    it.skip('Should create an invitation and send an email', function (done) {
      request.post(`http://localhost:${PORT}/invite/`)
      .set('Authorization', `gi ${signatures[0]}`)
      .send({groupId: 1, email: 'jack@test.com'})
      .end(function (err, res) {
        should(err).be.null()
        res.status.should.equal(200)
        res.body.link.length.should.be.greaterThan(0)

        request.post(res.body.link)
        .redirects(0)
        .end(function (err, res) {
          should(err).be.null()
          res.status.should.equal(200)
          res.text.length.should.be.greaterThan(0)
          done()
        })
      })
    })
  })

  describe('Income', function () {
    var income = null
    it('Should be possible to create an income', function (done) {
      request.post(`http://localhost:${PORT}/income/`)
      .set('Authorization', `gi ${signatures[0]}`)
      .send({amount: 1200})
      .end(function (err, res) {
        should(err).be.null()
        res.status.should.equal(200)
        res.text.length.should.be.greaterThan(0)
        income = res.body.income
        income.amount.should.equal(1200)
        done()
      })
    })

    it('Should be possible to update an income', function (done) {
      request.post(`http://localhost:${PORT}/income/`)
      .set('Authorization', `gi ${signatures[0]}`)
      .send({amount: 1500})
      .end(function (err, res) {
        should(err).be.null()
        res.status.should.equal(200)
        res.text.length.should.be.greaterThan(0)
        res.body.income.amount.should.equal(1500)
        res.body.income.id.should.equal(income.id)
        done()
      })
    })
  })
})
