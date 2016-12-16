/* globals logger */

import * as db from './database'
import {EVENT_TYPE} from '../shared/constants'
import {makeResponse} from '../shared/functions'
// const Boom = require('boom')
const Joi = require('joi')

const {SUCCESS, EVENT} = EVENT_TYPE

module.exports = function (server) {
  const payloadValidation = {
    hash: Joi.string().required(),
    // must match db.Log.jsonSchema.properties (except for separated hash)
    entry: Joi.object({
      id: Joi.number().integer().min(0).required(),
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
    path: '/event/{id}',
    handler: async function (request, reply) {
      try {
        var groupId = request.params.id
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
