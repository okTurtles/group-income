/* globals logger */

import { GIMessage } from '../shared/GIMessage.js'
import * as db from './database.js'
const Boom = require('@hapi/boom')
const Joi = require('@hapi/joi')

// NOTE: We could get rid of this RESTful API and just rely on pubsub.js to do this
//       —BUT HTTP2 might be better than websockets and so we keep this around.
//       See related TODO in pubsub.js and the reddit discussion link.
export default function (server: Object) {
  server.route({
    path: '/event',
    method: ['PUT', 'POST'],
    options: {
      auth: 'gi-auth', // TODO: implement real group-based auth
      validate: { payload: Joi.string().required() }
    },
    handler: function (request, h) {
      try {
        console.log('/event handler')
        const entry = GIMessage.deserialize(request.payload)
        server.handleEntry(entry)
        return entry.hash()
      } catch (err) {
        logger(err)
        return err
      }
    }
  })
  server.route({
    path: '/events/{contractID}/{since}',
    method: ['GET'],
    handler: async function (request, h) {
      try {
        const { contractID, since } = request.params
        var stream = db.streamEntriesSince(contractID, since)
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
    }
  })
  server.route({
    path: '/name',
    method: ['POST'],
    options: { validate: { payload: {
      name: Joi.string().required(),
      value: Joi.string().required()
    } } },
    handler: function (request, h) {
      try {
        const { name, value } = request.payload
        if (db.lookupName(name)) {
          return Boom.conflict('exists')
        } else {
          db.registerName(name, value)
          return { name, value }
        }
      } catch (err) {
        logger(err)
        return err
      }
    }
  })
  server.route({
    path: '/name/{name}',
    method: ['GET'],
    handler: function (request, h) {
      try {
        return db.lookupName(request.params.name) || Boom.notFound()
      } catch (err) {
        logger(err)
        return err
      }
    }
  })
  server.route({
    path: '/latestHash/{contractID}',
    method: ['GET'],
    handler: function (request, h) {
      try {
        var entry = db.lastEntry(request.params.contractID)
        return entry ? entry.hash() : Boom.notFound()
      } catch (err) {
        logger(err)
        return err
      }
    }
  })
}
