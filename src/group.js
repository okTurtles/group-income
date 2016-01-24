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
    path: '/group/{id}',
    handler: function (request, reply) {
      db.Group.find({where: {id: request.params.id}})
      .then(reply)
      .catch(reply)
    }
  })

  server.route({
    config: {
      validate: {
        payload: {
          name: Joi.string().min(3).max(50).required(),
          creator: Joi.number().min(1).required()
        }
      }
    },
    method: 'POST',
    path: '/group/',
    handler: function (request, reply) {
      db.Group.create(request.payload)
      .then(function (res) {
        reply(res.dataValues)
      })
      .catch(reply)
    }
  })

  db.Group = db.define('BIGroup', {
    name: {type: Sequelize.STRING},
    creator: {type: Sequelize.INTEGER}
  }, {
    freezeTableName: true
  })

  return db.Group.sync()
}
