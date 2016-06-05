'use strict'

// setup the database and re-export 'db'
export {db} from './database'

const Hapi = require('hapi')
const Boom = require('boom')

// ---------------------------------------
// Setup Hapi server
// ---------------------------------------

export var server = new Hapi.Server({
  // TODO: improve logging and base it on process.env.NODE_ENV
  debug: { request: ['error'], log: ['error'] }
})

server.connection({
  port: process.env.API_PORT,
  // See: https://github.com/hapijs/discuss/issues/262#issuecomment-204616831
  routes: { cors: { origin: [process.env.FRONTEND_URL] } }
})

// ---------------------------------------
// Setup authentication
// ---------------------------------------

server.auth.scheme('gi-auth', function (server, options) {
  return {
    authenticate: function (request, reply) {
      const {authorization} = request.headers
      if (!authorization) return reply(Boom.unauthorized('Missing authorization'))

      var [scheme, json] = authorization.split(/\s+/)
      if (scheme !== 'gi') return reply(Boom.badRequest('Bad authentication'))

      try {
        json = JSON.parse(b642str(json))
      } catch (e) {
        return reply(Boom.badRequest('Invalid token format'))
      }
      // http://hapijs.com/api/#serverauthschemename-scheme
      options.verify(request, json, (err, isValid, credentials) => {
        credentials = { credentials: credentials || json }
        if (err) return reply(err, null, credentials)
        if (!isValid) return reply(Boom.unauthorized('Bad credentials'), null, credentials)
        return reply.continue(credentials)
      })
    }
  }
})

// TODO: this validate function should be moved to its own file and made more serious
const nacl = require('tweetnacl')
var b642buf = b64 => Buffer.from(b64, 'base64')
var str2buf = str => Buffer.from(str, 'utf8')
var b642str = b64 => b642buf(b64).toString('utf8')
server.auth.strategy('gi-auth', 'gi-auth', {
  verify: function (req, json, cb) {
    var result = nacl.sign.detached.verify(str2buf(json.msg), b642buf(json.sig), b642buf(json.key))
    json.userId = json.key
    cb(null, result, json)
  }
})
