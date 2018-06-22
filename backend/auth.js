// create our auth plugin. see:
// https://hapijs.com/tutorials/auth
// https://hapijs.com/tutorials/plugins

import {verify} from '../shared/functions'

const Boom = require('boom')

exports.register = function (
  server: Object,
  opts: Object,
  next: (?Error) => void
) {
  server.auth.scheme('gi-auth', function (server, options) {
    return {
      authenticate: function (request, reply) {
        const {authorization} = request.headers
        if (!authorization) return reply(Boom.unauthorized('Missing authorization'))

        var [scheme, json] = authorization.split(/\s+/)
        if (scheme !== 'gi') return reply(Boom.badRequest('Bad authentication'))

        try {
          json = JSON.parse(b64ToStr(json))
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

  var b64ToBuf = b64 => Buffer.from(b64, 'base64')
  var b64ToStr = b64 => b64ToBuf(b64).toString('utf8')
  server.auth.strategy('gi-auth', 'gi-auth', {
    verify: function (req, json, cb) {
      var result = verify(json.msg, json.key, json.sig)
      json.userId = json.key
      cb(null, result, json)
    }
  })

  next()
}

exports.register.attributes = {
  name: 'gi-auth'
}
