/* globals logger */

import {RESPONSE_TYPE} from '../shared/constants'
import {makeResponse} from '../shared/functions'
// const Boom = require('boom')
const Joi = require('joi')

module.exports = function (server: Object) {
  const payloadValidation = Joi.object({
    hash: Joi.string().required(),
    // must match db.Log.jsonSchema.properties (except for separated hash)
    entry: Joi.object({
      version: Joi.string().required(),
      type: Joi.string().required(),
      parentHash: Joi.string().allow(null),
      data: [Joi.string(), Joi.object()]
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
    path: '/event/{groupId}',
    handler: async function (request, reply) {
      try {
        // TODO: echo back the entry if it's the latest, or send with a different
        //       status code the entries that the client is missing
        //       or, send back an error if the parentHash doesn't exist
        //       in the database at all. (or an error if hash is invalid)
        var groupId = request.params.groupId
        var {hash, entry} = request.payload
        await server.handleEvent(groupId, hash, entry)
        reply(makeResponse(RESPONSE_TYPE.SUCCESS, {hash}))
      } catch (err) {
        logger(err)
        reply(err)
      }
    }
  })
}
