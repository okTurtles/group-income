// create our auth plugin. see:
// https://hapijs.com/tutorials/auth
// https://hapijs.com/tutorials/plugins

import { verifyShelterAuthorizationHeader } from '~/shared/domains/chelonia/utils.js'
const Boom = require('@hapi/boom')

exports.plugin = {
  name: 'gi-auth',
  register: function (server: Object, opts: Object) {
    server.auth.scheme('gi-auth', function (server, options) {
      return {
        authenticate: function (request, h) {
          const { authorization } = request.headers
          if (!authorization) {
            return h.unauthenticated()
          }
          // https://www.rfc-editor.org/rfc/rfc7230#section-3.2.6
          // https://www.rfc-editor.org/rfc/rfc7235#appendix-C
          const scheme = authorization.match(/^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+(?= .)/)
          if (!scheme || String(scheme[0]).toLowerCase() !== 'shelter') {
            return h.unauthenticated(Boom.badRequest('Bad authentication'))
          }
          const billableContractID = verifyShelterAuthorizationHeader(authorization)
          return h.authenticated({ credentials: { billableContractID } })
        }
      }
    })

    server.auth.strategy('gi-auth', 'gi-auth')
  }
}
