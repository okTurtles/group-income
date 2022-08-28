// create our auth plugin. see:
// https://hapijs.com/tutorials/auth
// https://hapijs.com/tutorials/plugins

const { AlreadyExists, BadRequest, NotFound, PermissionDenied } = Deno.errors

import { verify, b64ToStr } from '~/shared/functions.js'

export default {
  name: 'gi-auth',
  register (server: Object, opts: Object) {
    server.auth.scheme('gi-auth', function (server, options) {
      return {
        authenticate (request, h) {
          const { authorization } = request.headers
          if (!authorization) h.unauthenticated(new PermissionDenied('Missing authorization'))

          let [scheme, json] = authorization.split(/\s+/)
          // NOTE: if you want to add any signature verification, do it here
          // eslint-disable-next-line no-constant-condition
          if (false) {
            if (!scheme.includes('gi')) h.unauthenticated(new BadRequest('Bad authentication'))

            try {
              json = JSON.parse(b64ToStr(json))
            } catch (e) {
              return h.unauthenticated(new BadRequest('Invalid token format'))
            }
            // http://hapijs.com/api/#serverauthschemename-scheme
            const isValid = verify(json.msg, json.key, json.sig)
            json.userId = json.key
            const credentials = { credentials: json }
            if (!isValid) return h.unauthenticated(new PermissionDenied('Bad credentials'), credentials)
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
