/* globals logger */

'use strict'

import sbp from '~/shared/sbp.js'
import { GIMessage } from '~/shared/GIMessage.js'
import { blake32Hash } from '~/shared/functions.js'
import { SERVER_INSTANCE } from './instance-keys.js'
import path from 'path'
import chalk from 'chalk'
import './database.js'
import './translations.js'

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
    if (err.name === 'ErrorDBBadPreviousHEAD') {
      console.error(chalk.bold.yellow('ErrorDBBadPreviousHEAD'), err)
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

route.GET('/latestHash/{contractID}', {}, async function (request, h) {
  try {
    const entry = await sbp('gi.db/log/lastEntry', request.params.contractID)
    return entry ? entry.hash() : Boom.notFound()
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
    return process.env.API_URL + '/file/' + hash
  } catch (err) {
    return logger(err)
  }
})

route.GET('/file/{hash}', {}, async function (request, h) {
  try {
    return await sbp('backend/db/readFile', request.params.hash)
  } catch (err) {
    return logger(err)
  }
})

route.GET('/translations/get/{language}', {}, async function (request, h) {
  try {
    return await sbp('backend/translations/get', request.params.language)
  } catch (err) {
    return logger(err)
  }
})

// SPA routes

route.GET('/assets/{path*}', {
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
  }
}, {
  directory: {
    path: path.resolve('./dist/assets'),
    redirectToSlash: true
  }
})

route.GET('/app/{path*}', {}, {
  file: path.resolve('./dist/index.html')
})

route.GET('/', {}, function (req, h) {
  return h.redirect('/app/')
})
