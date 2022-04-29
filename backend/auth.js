// create our auth plugin. see:
// https://hapijs.com/tutorials/auth
// https://hapijs.com/tutorials/plugins

import { verify, b64ToStr } from '~/shared/functions.js'

const Boom = require('@hapi/boom')

exports.plugin = {
  name: 'gi-auth',
  register: function (server: Object, opts: Object) {
    server.auth.scheme('gi-auth', function (server, options) {
      return {
        authenticate: function (request, h) {
          const { authorization } = request.headers
          if (!authorization) h.unauthenticated(Boom.unauthorized('Missing authorization'))

          let [scheme, json] = authorization.split(/\s+/)
          // NOTE: if you want to add any signature verification, do it here
          // eslint-disable-next-line no-constant-condition
          if (false) {
            if (!scheme.includes('gi')) h.unauthenticated(Boom.badRequest('Bad authentication'))

            try {
              json = JSON.parse(b64ToStr(json))
            } catch (e) {
              return h.unauthenticated(Boom.badRequest('Invalid token format'))
            }
            // http://hapijs.com/api/#serverauthschemename-scheme
            const isValid = verify(json.msg, json.key, json.sig)
            json.userId = json.key
            const credentials = { credentials: json }
            if (!isValid) return h.unauthenticated(Boom.unauthorized('Bad credentials'), credentials)
            return h.authenticated(credentials)
          } else {
            // remove this if you decide to implement it
            return h.authenticated({ credentials: 'TODO: delete me' })
          }
        }
      }
    })

    server.auth.strategy('gi-auth', 'gi-auth')
  }
}
