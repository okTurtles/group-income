/* globals logger */

import {server, db} from './setup'

var Promise = require('bluebird')
var Joi = require('joi')
var bcrypt = require('bcrypt')
var hash = Promise.promisify(bcrypt.hash)
var Boom = require('boom')

server.route({
  config: { auth: 'gi-auth' },
  method: 'GET',
  path: '/user/',
  handler: async function (request, reply) {
    try {
      var user = await db.User.findOne(request.auth.credentials.userId)
      reply(user ? user.toJSON() : Boom.notFound())
    } catch (err) {
      logger(err)
      reply(err)
    }
  }
})

server.route({
  config: {
    auth: 'gi-auth',
    validate: { payload: {
      name: Joi.string().min(3).max(50).required(),
      email: Joi.string().email().allow('').required(),
      password: Joi.string().min(7).max(50).required(),
      phone: Joi.string().min(7).max(14).allow(''),
      contriGL: Joi.number().integer().required(),
      contriRL: Joi.number().integer().required(),
      payPaypal: Joi.string().allow(''),
      payBitcoin: Joi.string().allow(''),
      payVenmo: Joi.string().allow(''),
      payInstructions: Joi.string().allow('')
    } }
  },
  method: 'POST',
  path: '/user/',
  handler: async function (request, reply) {
    try {
      request.payload.id = request.auth.credentials.userId
      request.payload.password = await hash(request.payload.password, 8)
      await db.User.create(request.payload)
      reply()
    } catch (err) {
      if (err.invalidAttributes) {
        // invalidAttributes looks like: {
        // id:
        //  [ { value: '2cu5+nEB9kI1ase4YjOZRz4xhkyfWneHtXKNjIAmsu0=',
        //      rule: 'unique',
        //      message: 'A record with that `id` already exists (`2cu5+nEB9kI1ase4YjOZRz4xhkyfWneHtXKNjIAmsu0=`).' } ],
        // name:
        //  [ { value: 'asdfsdf',
        //      rule: 'unique',
        //      message: 'A record with that `name` already exists (`asdfsdf`).' } ] }
        reply(Boom.conflict('Already exists'))
      } else {
        logger(err)
        reply(err)
      }
    }
  }
})
