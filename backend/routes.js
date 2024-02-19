/* globals logger */

'use strict'

import sbp from '@sbp/sbp'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import { createCID } from '~/shared/functions.js'
import { SERVER_INSTANCE } from './instance-keys.js'
import path from 'path'
import chalk from 'chalk'
import './database.js'
import { registrationKey, register, getChallenge, getContractSalt, updateContractSalt } from './zkppSalt.js'
const Boom = require('@hapi/boom')
const Joi = require('@hapi/joi')
const isCheloniaDashboard = process.env.IS_CHELONIA_DASHBOARD_DEV
const staticServeConfig = {
  routePath: isCheloniaDashboard ? '/dashboard/{path*}' : '/app/{path*}',
  distAssets: path.resolve(isCheloniaDashboard ? 'dist-dashboard/assets' : 'dist/assets'),
  distIndexHtml: path.resolve(isCheloniaDashboard ? './dist-dashboard/index.html' : './dist/index.html'),
  redirect: isCheloniaDashboard ? '/dashboard/' : '/app/'
}

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
    try {
      await sbp('backend/server/handleEntry', entry)
    } catch (err) {
      if (err.name === 'ChelErrorDBBadPreviousHEAD') {
        console.error(chalk.bold.yellow('ChelErrorDBBadPreviousHEAD'), err)
        const HEADinfo = await sbp('chelonia/db/latestHEADinfo', entry.contractID()) ?? { HEAD: null, height: 0 }
        const r = Boom.conflict(err.message, { HEADinfo })
        Object.assign(r.output.headers, {
          'shelter-headinfo-head': HEADinfo.HEAD,
          'shelter-headinfo-height': HEADinfo.height
        })
        return r
      }
    }
    return entry.hash()
  } catch (err) {
    return logger(err)
  }
})

route.GET('/eventsAfter/{contractID}/{since}', {}, async function (request, h) {
  try {
    const { contractID, since } = request.params

    if (contractID.startsWith('_private_') || since.startsWith('_private_')) {
      return Boom.notFound()
    }

    const stream = await sbp('backend/db/streamEntriesAfter', contractID, since)
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

route.GET('/eventsBefore/{before}/{limit}', {}, async function (request, h) {
  try {
    const { before, limit } = request.params

    if (!before) return Boom.badRequest('missing before')
    if (!limit) return Boom.badRequest('missing limit')
    if (isNaN(parseInt(limit)) || parseInt(limit) <= 0) return Boom.badRequest('invalid limit')
    if (before.startsWith('_private_')) return Boom.notFound()

    const stream = await sbp('backend/db/streamEntriesBefore', before, parseInt(limit))
    request.events.once('disconnect', stream.destroy.bind(stream))
    return stream
  } catch (err) {
    return logger(err)
  }
})

route.GET('/eventsBetween/{startHash}/{endHash}', {}, async function (request, h) {
  try {
    const { startHash, endHash } = request.params
    const offset = parseInt(request.query.offset || '0')

    if (!startHash) return Boom.badRequest('missing startHash')
    if (!endHash) return Boom.badRequest('missing endHash')
    if (isNaN(offset) || offset < 0) return Boom.badRequest('invalid offset')
    if (startHash.startsWith('_private_') || endHash.startsWith('_private_')) return Boom.notFound()

    const stream = await sbp('backend/db/streamEntriesBetween', startHash, endHash, offset)
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
    if (value.startsWith('_private_')) return Boom.badData()
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

route.GET('/latestHEADinfo/{contractID}', {
  cache: { otherwise: 'no-store' }
}, async function (request, h) {
  try {
    const { contractID } = request.params
    if (contractID.startsWith('_private_')) return Boom.notFound()
    const HEADinfo = await sbp('chelonia/db/latestHEADinfo', contractID)
    if (!HEADinfo) {
      console.warn(`[backend] latestHEADinfo not found for ${contractID}`)
      return Boom.notFound()
    }
    return HEADinfo
  } catch (err) {
    return logger(err)
  }
})

route.GET('/time', {}, function (request, h) {
  return new Date().toISOString()
})

// TODO: if the browser deletes our cache then not everyone
//       has a complete copy of the data and can act as a
//       new coordinating server... I don't like that.

const MEGABYTE = 1048576 // TODO: add settings for these
const SECOND = 1000

// File upload route.
// If accepted, the file will be stored in Chelonia DB.
route.POST('/file', {
  // TODO: only allow uploads from registered users
  payload: {
    parse: true,
    output: 'stream',
    multipart: { output: 'annotated' },
    allow: 'multipart/form-data',
    failAction: function (request, h, err) {
      console.error('failAction error:', err)
      return err
    },
    maxBytes: 6 * MEGABYTE, // TODO: make this a configurable setting
    timeout: 10 * SECOND // TODO: make this a configurable setting
  }
}, async function (request, h) {
  try {
    console.log('FILE UPLOAD!')
    console.log(request.payload)
    console.log(Object.keys(request))
    const { hash, data } = request.payload
    if (!hash) return Boom.badRequest('missing hash')
    if (!data) return Boom.badRequest('missing data')
    const ourHash = createCID(data)
    if (ourHash !== hash) {
      console.error(`hash(${hash}) != ourHash(${ourHash})`)
      return Boom.badRequest('bad hash!')
    }
    await sbp('chelonia/db/set', hash, data)
    return '/file/' + hash
  } catch (err) {
    return logger(err)
  }
})

// Serve data from Chelonia DB.
// Note that a `Last-Modified` header isn't included in the response.
route.GET('/file/{hash}', {
  cache: {
    // Do not set other cache options here, to make sure the 'otherwise' option
    // will be used so that the 'immutable' directive gets included.
    otherwise: 'public,max-age=31536000,immutable'
  }
}, async function (request, h) {
  const { hash } = request.params
  console.debug(`GET /file/${hash}`)

  if (hash.startsWith('_private_')) {
    return Boom.notFound()
  }

  const blobOrString = await sbp('chelonia/db/get', `any:${hash}`)
  if (!blobOrString) {
    return Boom.notFound()
  }
  return h.response(blobOrString).etag(hash)
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
    relativeTo: staticServeConfig.distAssets
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

route.GET(staticServeConfig.routePath, {}, {
  file: staticServeConfig.distIndexHtml
})

route.GET('/', {}, function (req, h) {
  return h.redirect(staticServeConfig.redirect)
})

route.POST('/zkpp/register/{contractID}', {
  validate: {
    payload: Joi.alternatives([
      {
        // what b is
        b: Joi.string().required()
      },
      {
        r: Joi.string().required(), // what r is
        s: Joi.string().required(), // what s is
        sig: Joi.string().required(),
        Eh: Joi.string().required()
      }
    ])
  }
}, async function (req, h) {
  if (req.params['contractID'].startsWith('_private_')) return Boom.notFound()
  try {
    if (req.payload['b']) {
      const result = await registrationKey(req.params['contractID'], req.payload['b'])

      if (result) {
        return result
      }
    } else {
      const result = await register(req.params['contractID'], req.payload['r'], req.payload['s'], req.payload['sig'], req.payload['Eh'])

      if (result) {
        return result
      }
    }
  } catch (e) {
    const ip = req.info.remoteAddress
    console.error('Error at POST /zkpp/{contractID}: ' + e.message, { ip })
  }

  return Boom.internal('internal error')
})

route.GET('/zkpp/{contractID}/auth_hash', {
  validate: {
    query: Joi.object({ b: Joi.string().required() })
  }
}, async function (req, h) {
  if (req.params['contractID'].startsWith('_private_')) return Boom.notFound()
  try {
    const challenge = await getChallenge(req.params['contractID'], req.query['b'])

    return challenge || Boom.notFound()
  } catch (e) {
    const ip = req.info.remoteAddress
    console.error('Error at GET /zkpp/{contractID}/auth_hash: ' + e.message, { ip })
  }

  return Boom.internal('internal error')
})

route.GET('/zkpp/{contractID}/contract_hash', {
  validate: {
    query: Joi.object({
      r: Joi.string().required(),
      s: Joi.string().required(),
      sig: Joi.string().required(),
      hc: Joi.string().required()
    })
  }
}, async function (req, h) {
  if (req.params['contractID'].startsWith('_private_')) return Boom.notFound()
  try {
    const salt = await getContractSalt(req.params['contractID'], req.query['r'], req.query['s'], req.query['sig'], req.query['hc'])

    if (salt) {
      return salt
    }
  } catch (e) {
    const ip = req.info.remoteAddress
    console.error('Error at GET /zkpp/{contractID}/contract_hash: ' + e.message, { ip })
  }

  return Boom.internal('internal error')
})

route.POST('/zkpp/updatePasswordHash/{contractID}', {
  validate: {
    payload: Joi.object({
      r: Joi.string().required(),
      s: Joi.string().required(),
      sig: Joi.string().required(),
      hc: Joi.string().required(),
      Ea: Joi.string().required()
    })
  }
}, async function (req, h) {
  if (req.params['contractID'].startsWith('_private_')) return Boom.notFound()
  try {
    const result = await updateContractSalt(req.params['contract'], req.payload['r'], req.payload['s'], req.payload['sig'], req.payload['hc'], req.payload['Ea'])

    if (result) {
      return result
    }
  } catch (e) {
    const ip = req.info.remoteAddress
    console.error('Error at POST /zkpp/updatePasswordHash/{contract}: ' + e.message, { ip })
  }

  return Boom.internal('internal error')
})
