/* globals logger */

import {RESPONSE_TYPE} from '../shared/constants'
import {makeResponse} from '../shared/functions'
import * as Events from '../shared/events'
import * as db from './database'
const Boom = require('boom')
const Joi = require('joi')

// NOTE: We could get rid of this RESTful API and just rely on pubsub.js to do this
//       —BUT HTTP2 might be better than websockets and so we keep this around.
//       See related TODO in pubsub.js and the reddit discussion link.
module.exports = function (server: Object) {
  const payloadValidation = Joi.object({
    hash: Joi.string().required(),
    // must match db.Log.jsonSchema.properties (except for separated hash)
    entry: Joi.object({
      version: Joi.string().required(),
      type: Joi.string().required(),
      parentHash: Joi.string().allow([null, '']),
      data: Joi.object()
    })
  })
  server.route({
    config: {
      auth: 'gi-auth',
      validate: { payload: payloadValidation }
    },
    method: ['PUT', 'POST'],
    // TODO: we have to prevent spam. can't have someone flooding the server.
    //       do group signature based authentication here to prevent spam
    path: '/event/{contractId}',
    handler: async function (request, reply) {
      try {
        // TODO: echo back the entry if it's the latest, or send with a different
        //       status code the entries that the client is missing
        //       or, send back an error if the parentHash doesn't exist
        //       in the database at all. (or an error if hash is invalid)
        var contractId = request.params.contractId
        var {hash, entry} = request.payload
        var event = Events[entry.type].fromObject(entry, hash)
        await server.handleEvent(contractId, event)
        reply(makeResponse(RESPONSE_TYPE.SUCCESS, {hash}))
      } catch (err) {
        logger(err)
        reply(err)
      }
    }
  })
  server.route({
    config: { validate: { payload: payloadValidation } },
    method: ['POST'],
    path: '/name',
    handler: async function (request, reply) {
      try {
        var {hash, entry} = request.payload
        var identity = Events.Identity.fromObject(entry, hash)
        var exists = await db.lookupName(identity.data.name)
        if (exists) {
          reply(Boom.conflict('exists'))
        } else {
          await server.handleEvent(hash, entry)
          await db.registerName(identity.data.name, hash)
          reply(makeResponse(RESPONSE_TYPE.SUCCESS, {hash}))
        }
      } catch (err) {
        logger(err)
        reply(err)
      }
    }
  })
  server.route({
    method: ['GET'],
    path: '/name/{name}',
    handler: async function (request, reply) {
      try {
        var hash = await db.lookupName(request.params.name)
        reply(hash ? makeResponse(RESPONSE_TYPE.SUCCESS, {hash}) : Boom.notFound())
      } catch (err) {
        logger(err)
        reply(err)
      }
    }
  })
}
