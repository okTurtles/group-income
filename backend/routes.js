/* globals logger */

import * as db from './database'
import {EVENT_TYPE} from '../shared/constants'
import {makeResponse} from '../shared/functions'
// const Boom = require('boom')
const Joi = require('joi')

const {SUCCESS, EVENT} = EVENT_TYPE

module.exports = function (server: Object) {
  const payloadValidation = {
    hash: Joi.string().required(),
    // must match db.Log.jsonSchema.properties (except for separated hash)
    entry: Joi.object({
      version: Joi.string().required(),
      parentHash: Joi.string().allow(null).required(),
      data: Joi.object()
    })
  }
  server.route({
    config: { validate: { payload: payloadValidation } },
    method: ['PUT', 'POST'],
    path: '/group',
    // TODO: we have to prevent spam. can't have someone flooding the server.
    handler: async function (request, reply) {
      try {
        // TODO: here we should register our pubkey with the server which in
        //       turn should be used by gi-auth to authenticate other actions.
        var {hash, entry} = request.payload
        await db.createGroup(hash, entry)
        reply(makeResponse(SUCCESS, {hash}))
      } catch (err) {
        logger(err)
        reply(err)
      }
    }
  })
  server.route({
    config: {
      auth: 'gi-auth',
      validate: { payload: payloadValidation }
    },
    method: ['PUT', 'POST'],
    path: '/event/{groupId}',
    handler: async function (request, reply) {
      try {
        // TODO: echo back the entry if it's the latest, or send with a different
        //       status code the entries that the client is missing
        //       or, send back an error if the parentHash doesn't exist
        //       in the database at all. (or an error if hash is invalid)
        var groupId = request.params.groupId
        var {hash, entry} = request.payload
        await db.appendLogEntry(groupId, hash, entry)
        server.primus.room(groupId).write(makeResponse(EVENT, {hash, entry}))
        reply(makeResponse(SUCCESS, {hash}))
      } catch (err) {
        logger(err)
        reply(err)
      }
    }
  })
}
