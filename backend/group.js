/* globals logger */

import {server, db} from './setup'

var Joi = require('joi')
var Sequelize = require('Sequelize')

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
  handler: function (request, reply) {
    db.UserGroup.findOne({where: {groupId: request.params.id, userId: request.auth.credentials.userId}, include: [db.User, db.Group]})
    .then(function (group) {
      reply(group)
    })
    .catch(function (err) {
      logger(err)
      reply(err)
    })
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
  handler: function (request, reply) {
    var savedGroup = null
    var userId = request.auth.credentials.userId

    db.transaction(function (t) {
      return db.Group.create(request.payload, {transaction: t})
      .then(function (group) {
        savedGroup = group.dataValues
        return db.UserGroup.create({userId: userId, groupId: savedGroup.id}, {transaction: t})
      })
      .then(function (stuff) {
        reply({group: savedGroup})
      })
    })
    .catch(function (err) {
      logger(err)
      reply(err)
    })
  }
})

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
  handler: function (request, reply) {
    db.UserGroup.create({userId: request.auth.credentials.userId, groupId: request.params.group})
    .then(function (association) {
      reply({userGroup: association.dataValues})
    })
    .catch(function (err) {
      logger(err)
      reply(err)
    })
  }
})

db.Group = db.define('BIGroup', {
  name: {type: Sequelize.STRING, unique: true, allowNull: false}
}, {
  freezeTableName: true
})

module.exports = db.Group.sync()
