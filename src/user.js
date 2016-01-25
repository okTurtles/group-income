/* globals logger */

var Joi = require('joi')
var bcrypt = require('bcrypt')
var uuid = require('node-uuid')
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
        reply(err)
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
          phone: Joi.string().min(7).max(14).required(),
          contriGL: Joi.number().integer().required(),
          contriRL: Joi.number().integer().required()
        }
      }
    },
    method: 'POST',
    path: '/user/',
    handler: function (request, reply) {
      var savedUser = null

      hash(request.payload.password, 8)
      .then(function (hashed) {
        request.payload.password = hashed
        return db.User.create(request.payload)
      })
      .then(function (user) {
        savedUser = user.dataValues
        return db.Session.findOne({where: {logout: null, user: savedUser.id}})
      })
      .then(function (session) {
        request.cookieAuth.set(session.dataValues)
        reply({user: savedUser, session: session.dataValues})
      })
      .catch(function (err) {
        logger(err)
        reply(err)
      })
    }
  })

  db.User = db.define('User', {
    name: {type: Sequelize.STRING, unique: true, allowNull: false},
    email: {type: Sequelize.STRING, allowNull: false},
    password: {type: Sequelize.STRING, allowNull: false},
    phone: {type: Sequelize.STRING, allowNull: false},
    contriGL: {type: Sequelize.INTEGER, allowNull: false},
    contriRL: {type: Sequelize.INTEGER, allowNull: false}
  }, {
    freezeTableName: true,
    hooks: {
      afterCreate: function (instance) {
        return db.Session.create({id: uuid.v4(), user: instance.id, logout: null})
      }
    }
  })

  return db.User.sync()
}
