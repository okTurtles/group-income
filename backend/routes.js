/* globals logger */

'use strict'

import sbp from '~/shared/sbp.js'
import { GIMessage } from '~/shared/GIMessage.js'
import { blake32Hash } from '~/shared/functions.js'
import { SERVER_INSTANCE } from './instance-keys.js'
import './database.js'
const Boom = require('@hapi/boom')
const Joi = require('@hapi/joi')

const route = new Proxy({}, {
  get: function (obj, prop) {
    return function (path: string, options: Object, handler: Function) {
      sbp('okTurtles.data/apply', SERVER_INSTANCE, function (server: Object) {
        server.route({ path, method: prop, options, handler })
      })
    }
  }
})

// NOTE: We could get rid of this RESTful API and just rely on pubsub.js to do this
//       —BUT HTTP2 might be better than websockets and so we keep this around.
//       See related TODO in pubsub.js and the reddit discussion link.
route.POST('/event', {
  auth: 'gi-auth',
  validate: { payload: Joi.string().required() }
}, function (request, h) {
  try {
    console.log('/event handler')
    const entry = GIMessage.deserialize(request.payload)
    sbp('backend/server/handleEntry', entry)
    return entry.hash()
  } catch (err) {
    logger(err)
    return err
  }
})

route.GET('/events/{contractID}/{since}', {}, async function (request, h) {
  try {
    const { contractID, since } = request.params
    var stream = sbp('backend/db/streamEntriesSince', contractID, since)
    // "On an HTTP server, make sure to manually close your streams if a request is aborted."
    // From: http://knexjs.org/#Interfaces-Streams
    //       https://github.com/tgriesser/knex/wiki/Manually-Closing-Streams
    // Plus: https://hapijs.com/api#request-events
    // request.on('disconnect', stream.end.bind(stream))
    // NOTE: since rewriting database.js to remove objection.js and knex,
    //       we're currently returning a Readable stream, which doesn't have
    //       '.end'. If there are any issues we can try switching to returning a
    //       Writable stream. Both types however do have .destroy.
    request.events.once('disconnect', () => {
      stream.destroy.bind(stream)
    })
    return stream
  } catch (err) {
    logger(err)
    return err
  }
})

route.POST('/name', {
  validate: { payload: {
    name: Joi.string().required(),
    value: Joi.string().required()
  } }
}, function (request, h) {
  try {
    const { name, value } = request.payload
    if (sbp('backend/db/lookupName', name)) {
      return Boom.conflict('exists')
    } else {
      sbp('backend/db/registerName', name, value)
      return { name, value }
    }
  } catch (err) {
    logger(err)
    return err
  }
})

route.GET('/name/{name}', {}, function (request, h) {
  try {
    return sbp('backend/db/lookupName', request.params.name) || Boom.notFound()
  } catch (err) {
    logger(err)
    return err
  }
})

route.GET('/latestHash/{contractID}', {}, function (request, h) {
  try {
    var entry = sbp('backend/db/lastEntry', request.params.contractID)
    return entry ? entry.hash() : Boom.notFound()
  } catch (err) {
    logger(err)
    return err
  }
})

// file upload related
// TODO: WARNING: We want to be offline-first! This means we need to be
//       able to cache and store profile pictures offline, and in fact
//       load them not from the server by from the local cache, only
//       going to the server if we need to update the cache.
//       Answers:
//       - https://www.raymondcamden.com/2018/10/05/storing-retrieving-photos-in-indexeddb
//       - https://www.raymondcamden.com/2016/06/03/capturing-camerapicture-data-without-phonegap-an-update
//       - https://hacks.mozilla.org/2012/02/storing-images-and-files-in-indexeddb/
//       - https://robertnyman.com/2012/03/06/storing-images-and-files-in-indexeddb/
//
//       NOTE: if the browser deletes our cache then not everyone
//             has a complete copy of the data and can act as a
//             new coordinating server... I don't like that.
//
// TODO: combine all of these routes into a single generic key-value store?
//       i.e. the first two routes (/event and /events) should be renamed
//       and should be able to handle file upload too...
//       OTOH having image specific handler could be useful for things like
//       specifying the size of the image...

const MEGABTYE = 1048576
const SECOND = 1000

route.POST('/file', {
  // TODO: only allow uploads from registered users
  payload: {
    output: 'data',
    allow: 'multipart/form-data',
    failAction: async function (request, h, err) {
      console.error('failAction triggered!')
      // console.error('failAction payload:', request)
      console.error('failAction error:', err)
      return err
    },
    maxBytes: 6 * MEGABTYE, // TODO: make this a configurable setting
    timeout: 10 * SECOND // TODO: make this a configurable setting
  }
}, function (request, h) {
  try {
    console.log('FILE UPLOAD!')
    console.log(request.payload)
    const { hash, data } = request.payload
    if (!hash) return Boom.badRequest('missing hash')
    if (!data) return Boom.badRequest('missing data')
    // console.log('typeof data:', typeof data)
    if (blake32Hash(data) !== hash) return Boom.badRequest('bad hash!')
    return hash // TODO: respond with URL hash to file
  } catch (err) {
    logger(err)
    return err
  }
})

route.GET('/file/{hash}', {}, function (request, h) {

})
