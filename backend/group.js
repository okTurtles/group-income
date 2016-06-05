/* globals logger */

import {server, db} from './setup'

var Joi = require('joi')
var Boom = require('boom')

server.route({
  config: {
    auth: 'gi-auth',
    validate: {
      params: {
        id: Joi.number().integer().min(1).required()
      }
    }
  },
  method: 'GET',
  path: '/group/{id}',
  handler: async function (request, reply) {
    try {
      var group = await db.Group.findOne(request.params.id)
      .populate('users', {id: request.auth.credentials.userId})
      reply((!group || group.users.length === 0) ? Boom.notFound() : group)
    } catch (err) {
      logger(err)
      reply(err)
    }
  }
})

server.route({
  config: {
    auth: 'gi-auth',
    validate: {
      payload: {
        name: Joi.string().min(3).max(50).required()
      }
    }
  },
  method: 'POST',
  path: '/group/',
  handler: async function (request, reply) {
    try {
      var userId = request.auth.credentials.userId
      request.payload.users = [userId]
      var group = await db.Group.create(request.payload)
      // await group.addUser(userId)
      reply({group: group.toJSON()})
    } catch (err) {
      logger(err)
      reply(err)
    }
  }
})

/*
server.route({
  config: {
    auth: 'gi-auth',
    validate: {
      params: {
        group: Joi.number().integer().min(1).required()
      }
    }
  },
  method: 'POST',
  path: '/group/{group}/invite',
  handler: async function (request, reply) {
    try {
      var association = await db.UserGroup.create({userId: request.auth.credentials.userId, groupId: request.params.group})
      reply({userGroup: association.toJSON()})
    } catch (err) {
      logger(err)
      reply(err)
    }
  }
})
*/

// db.Group = db.define('Group', {
//   name: {type: Sequelize.STRING, unique: true, allowNull: false}
// }, {
//   freezeTableName: true
// })
