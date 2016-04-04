/* globals logger */

var Promise = require('bluebird')
var Joi = require('joi')
var bcrypt = require('bcrypt')
var email = require('./helpers/email')
var uuid = require('node-uuid')
var ErrToBoom = require('./helpers/utils')
var hash = Promise.promisify(bcrypt.hash)

module.exports = function (server, Sequelize, db) {
  server.route({
    config: {
      validate: {
        params: {
          id: Joi.number().integer().min(1).required()
        }
      }
    },
    method: 'GET',
    path: '/user/{id}',
    handler: function (request, reply) {
      db.User.findOne({where: {id: request.params.id}})
      .then(reply)
      .catch(function (err) {
        logger(err)
        // http://hapijs.com/api/#error-transformation
        reply(ErrToBoom.badRequest(err))
      })
    }
  })

  server.route({
    config: {
      validate: {
        payload: {
          name: Joi.string().min(3).max(50).required(),
          email: Joi.string().email().required(),
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
    handler: function (request, reply) {
      hash(request.payload.password, 8)
      .then(function (hashed) {
        request.payload.verification = uuid.v4()
        request.payload.password = hashed
        return db.User.create(request.payload)
      })
      .then(function (user) {
        // TODO: Don't send the link before going to production
        var link = process.env.API_URL + '/user/' + user.dataValues.verification + '/verify'
        email.send(user.dataValues.email, 'Please verify your Group Income account', 'Click this link: ' + link)
        reply({user: user.dataValues, link: link})
      })
      .catch(function (err) {
        logger(err)
        reply(ErrToBoom.badRequest(err))
      })
    }
  })

  server.route({
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
        request.cookieAuth.set(savedSession)
        reply({user: savedUser, session: savedSession})
      })
      .catch(function (err) {
        logger(err)
        reply(ErrToBoom.badRequest(err))
      })
    }
  })

  db.User = db.define('User', {
    name: {type: Sequelize.STRING, unique: true, allowNull: false},
    email: {type: Sequelize.STRING, unique: true, allowNull: false},
    password: {type: Sequelize.STRING, allowNull: false},
    phone: {type: Sequelize.STRING, allowNull: true},
    verification: {type: Sequelize.STRING, allowNull: true},
    contriGL: {type: Sequelize.INTEGER, allowNull: false},
    contriRL: {type: Sequelize.INTEGER, allowNull: false},
    payPaypal: {type: Sequelize.STRING, allowNull: true},
    payBitcoin: {type: Sequelize.STRING, allowNull: true},
    payVenmo: {type: Sequelize.STRING, allowNull: true},
    payInstructions: {type: Sequelize.STRING, allowNull: true}

  }, {
    freezeTableName: true
  })

  return db.User.sync()
}
