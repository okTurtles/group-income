/* globals logger */

import {server, db} from './setup'
import { ErrToBoom } from './helpers/utils'

var Promise = require('bluebird')
var Joi = require('joi')
var bcrypt = require('bcrypt')
var hash = Promise.promisify(bcrypt.hash)
var Sequelize = require('Sequelize')
var Boom = require('boom')

server.route({
  config: { auth: 'gi-auth' },
  method: 'GET',
  path: '/user/',
  handler: async function (request, reply) {
    try {
      var user = await db.User.findOne({where: {id: request.auth.credentials.userId}})
      reply(user ? user.dataValues : Boom.notFound())
    } catch (err) {
      logger(err)
      reply(ErrToBoom.badRequest(err)) // http://hapijs.com/api/#error-transformation
    }
  }
})

server.route({
  config: {
    auth: 'gi-auth',
    validate: {
      payload: {
        name: Joi.string().min(3).max(50).required(),
        email: Joi.string().email().allow(''),
        password: Joi.string().min(7).max(50).required(),
        phone: Joi.string().min(7).max(14).allow(''),
        contriGL: Joi.number().integer().required(),
        contriRL: Joi.number().integer().required(),
        payPaypal: Joi.string().allow(''),
        payBitcoin: Joi.string().allow(''),
        payVenmo: Joi.string().allow(''),
        payInstructions: Joi.string().allow('')
      }
    }
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
      logger(err)
      reply(ErrToBoom.badRequest(err))
    }
  }
})

// TODO: we probably don't need this verification stuff
//       See: https://github.com/okTurtles/group-income-simple/issues/81
/* server.route({
  config: {
    validate: {
      params: {
        verification: Joi.string().min(36).max(36).required()
      }
    }
  },
  method: 'POST',
  path: '/user/{verification}/verify',
  handler: function (request, reply) {
    var savedUser = null
    var savedSession = null

    // TODO: get rid of this session stuff.
    // TODO: Session.create and User.update need to be wrapped together in a transaction
    db.User.findOne({where: {verification: request.params.verification}})
    .then(function (user) {
      if (user == null) return Promise.reject(new Error('Invalid verification link'))
      savedUser = user.dataValues
      return db.Session.create({id: uuid.v4(), userId: savedUser.id, logout: null})
    })
    .then(function (session) {
      savedSession = session.dataValues
      return db.User.update({verification: null}, {where: {id: savedUser.id}})
    })
    .then(function (user) {
      // request.cookieAuth.set(savedSession)
      reply({user: savedUser, session: savedSession})
    })
    .catch(function (err) {
      logger(err)
      reply(ErrToBoom.badRequest(err))
    })
  }
})*/

db.User = db.define('User', {
  id: {type: Sequelize.STRING, primaryKey: true, allowNull: false},
  name: {type: Sequelize.STRING, unique: true, allowNull: false},
  email: {type: Sequelize.STRING, unique: true, allowNull: true},
  password: {type: Sequelize.STRING, allowNull: false},
  phone: {type: Sequelize.STRING, allowNull: true},
  contriGL: {type: Sequelize.INTEGER, allowNull: false},
  contriRL: {type: Sequelize.INTEGER, allowNull: false},
  payPaypal: {type: Sequelize.STRING, allowNull: true},
  payBitcoin: {type: Sequelize.STRING, allowNull: true},
  payVenmo: {type: Sequelize.STRING, allowNull: true},
  payInstructions: {type: Sequelize.STRING, allowNull: true}

}, {
  freezeTableName: true
})
