/* globals logger */

'use strict'

import sbp from '@sbp/sbp'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import { blake32Hash } from '~/shared/functions.js'
import { SERVER_INSTANCE } from './instance-keys.js'
import path from 'path'
import chalk from 'chalk'
import './database.js'

const Boom = require('@hapi/boom')
const Joi = require('@hapi/joi')

const route = new Proxy({}, {
  get: function (obj, prop) {
    return function (path: string, options: Object, handler: Function | Object) {
      sbp('okTurtles.data/apply', SERVER_INSTANCE, function (server: Object) {
        server.route({ path, method: prop, options, handler })
      })
    }
  }
})

// RESTful API routes

// NOTE: We could get rid of this RESTful API and just rely on pubsub.js to do this
//       —BUT HTTP2 might be better than websockets and so we keep this around.
//       See related TODO in pubsub.js and the reddit discussion link.
route.POST('/event', {
  auth: 'gi-auth',
  validate: { payload: Joi.string().required() }
}, async function (request, h) {
  try {
    console.log('/event handler')
    const entry = GIMessage.deserialize(request.payload)
    await sbp('backend/server/handleEntry', entry)
    return entry.hash()
  } catch (err) {
    if (err.name === 'ChelErrorDBBadPreviousHEAD') {
      console.error(chalk.bold.yellow('ChelErrorDBBadPreviousHEAD'), err)
      return Boom.conflict(err.message)
    }
    return logger(err)
  }
})

route.GET('/events/{contractID}/{since}', {}, async function (request, h) {
  try {
    const { contractID, since } = request.params
    const stream = await sbp('backend/db/streamEntriesSince', contractID, since)
    // "On an HTTP server, make sure to manually close your streams if a request is aborted."
    // From: http://knexjs.org/#Interfaces-Streams
    //       https://github.com/tgriesser/knex/wiki/Manually-Closing-Streams
    // Plus: https://hapijs.com/api#request-events
    // request.on('disconnect', stream.end.bind(stream))
    // NOTE: since rewriting database.js to remove objection.js and knex,
    //       we're currently returning a Readable stream, which doesn't have
    //       '.end'. If there are any issues we can try switching to returning a
    //       Writable stream. Both types however do have .destroy.
    request.events.once('disconnect', stream.destroy.bind(stream))
    return stream
  } catch (err) {
    return logger(err)
  }
})

route.GET('/eventsBefore/{contractID}', {}, async function (request, h) {
  try {
    const { contractID } = request.params
    const { before, howMany } = request.query
    const stream = await sbp('backend/db/streamEntriesBefore', contractID, before, howMany)
    request.events.once('disconnect', stream.destroy.bind(stream))
    return stream
  } catch (err) {
    return logger(err)
  }
})

route.POST('/name', {
  validate: {
    payload: Joi.object({
      name: Joi.string().required(),
      value: Joi.string().required()
    })
  }
}, async function (request, h) {
  try {
    const { name, value } = request.payload
    return await sbp('backend/db/registerName', name, value)
  } catch (err) {
    return logger(err)
  }
})

route.GET('/name/{name}', {}, async function (request, h) {
  try {
    return await sbp('backend/db/lookupName', request.params.name)
  } catch (err) {
    return logger(err)
  }
})

route.GET('/latestHash/{contractID}', {
  cache: { otherwise: 'no-store' }
}, async function (request, h) {
  try {
    const { contractID } = request.params
    const hash = await sbp('chelonia/db/latestHash', contractID)
    if (!hash) {
      console.warn(`[backend] latestHash not found for ${contractID}`)
      return Boom.notFound()
    }
    return hash
  } catch (err) {
    return logger(err)
  }
})

route.GET('/time', {}, function (request, h) {
  return new Date().toISOString()
})

// file upload related

// TODO: if the browser deletes our cache then not everyone
//       has a complete copy of the data and can act as a
//       new coordinating server... I don't like that.

const MEGABTYE = 1048576 // TODO: add settings for these
const SECOND = 1000

route.POST('/file', {
  // TODO: only allow uploads from registered users
  payload: {
    output: 'data',
    multipart: true,
    allow: 'multipart/form-data',
    failAction: function (request, h, err) {
      console.error('failAction error:', err)
      return err
    },
    maxBytes: 6 * MEGABTYE, // TODO: make this a configurable setting
    timeout: 10 * SECOND // TODO: make this a configurable setting
  }
}, async function (request, h) {
  try {
    console.log('FILE UPLOAD!')
    console.log(request.payload)
    const { hash, data } = request.payload
    if (!hash) return Boom.badRequest('missing hash')
    if (!data) return Boom.badRequest('missing data')
    // console.log('typeof data:', typeof data)
    const ourHash = blake32Hash(data)
    if (ourHash !== hash) {
      console.error(`hash(${hash}) != ourHash(${ourHash})`)
      return Boom.badRequest('bad hash!')
    }
    await sbp('backend/db/writeFileOnce', hash, data)
    return '/file/' + hash
  } catch (err) {
    return logger(err)
  }
})

route.GET('/file/{hash}', {
  cache: {
    // Do not set other cache options here, to make sure the 'otherwise' option
    // will be used so that the 'immutable' directive gets included.
    otherwise: 'public,max-age=31536000,immutable'
  },
  files: {
    relativeTo: path.resolve('data')
  }
}, function (request, h) {
  const { hash } = request.params
  console.debug(`GET /file/${hash}`)
  // Reusing the given `hash` parameter to set the ETag should be faster than
  // letting Hapi hash the file to compute an ETag itself.
  return h.file(hash, { etagMethod: false }).etag(hash)
})

// SPA routes

route.GET('/assets/{subpath*}', {
  ext: {
    onPostHandler: {
      method (request, h) {
        // since our JS is placed under /assets/ and since service workers
        // have their scope limited by where they are, we must add this
        // header to allow the service worker to function. Details:
        // https://w3c.github.io/ServiceWorker/#service-worker-allowed
        if (request.path.includes('assets/js/sw-')) {
          console.debug('adding header: Service-Worker-Allowed /')
          request.response.header('Service-Worker-Allowed', '/')
        }
        return h.continue
      }
    }
  },
  files: {
    relativeTo: path.resolve('dist/assets')
  }
}, function (request, h) {
  const { subpath } = request.params
  const basename = path.basename(subpath)
  console.debug(`GET /assets/${subpath}`)
  // In the build config we told our bundler to use the `[name]-[hash]-cached` template
  // to name immutable assets. This is useful because `dist/assets/` currently includes
  // a few files without hash in their name.
  if (basename.includes('-cached')) {
    return h.file(subpath, { etagMethod: false })
      .etag(basename)
      .header('Cache-Control', 'public,max-age=31536000,immutable')
  }
  // Files like `main.js` or `main.css` should be revalidated before use. Se we use the default headers.
  // This should also be suitable for serving unversioned fonts and images.
  return h.file(subpath)
})

route.GET('/app/{path*}', {}, {
  file: path.resolve('./dist/index.html')
})

route.GET('/', {}, function (req, h) {
  return h.redirect('/app/')
})
