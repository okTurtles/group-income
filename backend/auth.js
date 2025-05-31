// create our auth plugin. see:
// https://hapijs.com/tutorials/auth
// https://hapijs.com/tutorials/plugins

import { verifyShelterAuthorizationHeader } from 'libchelonia/utils'
const Boom = require('@hapi/boom')

exports.plugin = {
  name: 'chel-auth',
  register: function (server: Object, opts: Object) {
    server.auth.scheme('chel-bearer', function (server, options) {
      return {
        authenticate: function (request, h) {
          const { authorization } = request.headers
          if (!authorization) {
            return h.unauthenticated(Boom.unauthorized(null, 'bearer'))
          }
          // Space after 'bearer' is intentional and must be there as it
          // acts as a separator
          const thisScheme = 'bearer '
          if (authorization.slice(0, thisScheme.length) !== thisScheme) {
            return h.unauthenticated(Boom.unauthorized(null, 'bearer'))
          }
          const token = authorization.slice(thisScheme.length)
          return h.authenticated({ credentials: { token } })
        }
      }
    })
    server.auth.scheme('chel-shelter', function (server, options) {
      return {
        authenticate: function (request, h) {
          const { authorization } = request.headers
          if (!authorization) {
            return h.unauthenticated(Boom.unauthorized(null, 'shelter'))
          }
          // Space after 'shelter' is intentional and must be there as it
          // acts as a separator
          const thisScheme = 'shelter '
          if (authorization.slice(0, thisScheme.length) !== thisScheme) {
            return h.unauthenticated(Boom.unauthorized(null, 'shelter'))
          }
          try {
            const billableContractID = verifyShelterAuthorizationHeader(authorization)
            return h.authenticated({ credentials: { billableContractID } })
          } catch (e) {
            console.warn(e, 'Shelter authorization failed')
            return h.unauthenticated(Boom.unauthorized('Authentication failed', 'shelter'))
          }
        }
      }
    })

    server.auth.strategy('chel-bearer', 'chel-bearer')
    server.auth.strategy('chel-shelter', 'chel-shelter')
  }
}
