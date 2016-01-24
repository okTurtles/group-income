var Joi = require('joi')

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
      db.User.find({id: request.params.id})
      .then(function (user) {
        reply(user)
      })
    }
  })

  server.route({
    config: {
      validate: {
        payload: {
          name: Joi.string().min(3).max(50).required(),
          email: Joi.string().email().required(),
          phone: Joi.string().min(7).max(14).required(),
          contriGL: Joi.number().integer().required(),
          contriRL: Joi.number().integer().required()
        }
      }
    },
    method: 'POST',
    path: '/user/',
    handler: function (request, reply) {
      db.User.create(request.payload)
      .then(function (res) {
        reply(res.dataValues)
      })
    }
  })

  db.User = db.define('User', {
    name: {type: Sequelize.STRING},
    email: {type: Sequelize.STRING},
    phone: {type: Sequelize.STRING},
    contriGL: {type: Sequelize.INTEGER},
    contriRL: {type: Sequelize.INTEGER}
  }, {
    freezeTableName: true
  })

  return db.User.sync()
}
