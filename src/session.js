/* globals logger */

var Joi = require('joi')
var bcrypt = require('bcrypt')
var uuid = require('node-uuid')
var compare = Promise.promisify(bcrypt.compare)
module.exports = function (server, Sequelize, db) {
  server.route({
    config: {
      validate: {
        payload: {
          email: Joi.string().email().required(),
          password: Joi.string().min(7).max(50).required()
        }
      }
    },
    method: 'POST',
    path: '/session/login',
    handler: function (request, reply) {
      var savedUser = null
      db.User.findOne({where: {email: request.payload.email}})
      .then(function (result) {
        var invalid = function () {
          return reply(new Error('Invalid email or password'))
        }

        if (result == null) return invalid()

        savedUser = result.dataValues
        return compare(request.payload.password, savedUser.password)
      })
      .then(function () {
        return db.Session.create({id: uuid.v4(), user: savedUser.id, logout: null})
      })
      .then(function (session) {
        request.cookieAuth.set(session.dataValues)
        reply({session: session.dataValues})
      })
      .catch(function (err) {
        logger(err)
        reply(err)
      })
    }
  })

  server.route({
    config: {
      auth: 'cookie_strategy'
    },
    method: 'POST',
    path: '/session/logout',
    handler: function (request, reply) {
      var userId = request.auth.credentials.user

      request.cookieAuth.clear()
      db.Session.update({logout: Date.now()}, {where: {user: userId}})
      .then(function () {
        reply()
      })
      .catch(function (err) {
        logger(err)
        reply(err)
      })
    }
  })

  db.Session = db.define('Session', {
    id: {type: Sequelize.UUID, primaryKey: true},
    user: {type: Sequelize.INTEGER, allowNull: false},
    logout: {type: Sequelize.DATE, allowNull: true}
  }, {
    freezeTableName: true
  })

  return db.Session.sync()
}
