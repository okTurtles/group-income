/* globals logger */

var Joi = require('joi')
var uuid = require('node-uuid')
var moment = require('moment')
module.exports = function (server, Sequelize, db) {
  server.route({
    config: {
      auth: 'cookie_strategy',
      validate: {
        payload: {
          amount: Joi.number().integer().min(1).required()
        }
      }
    },
    method: 'POST',
    path: '/income/',
    handler: function (request, reply) {
      var savedUser = null
      var currentMonth = moment().format('MM-Y')
      db.User.findOne({where: {id: request.auth.credentials.userId}})
      .then(function (user) {
        savedUser = user.dataValues
        return db.Income.findOne({where: {userId: savedUser.id, month: currentMonth}})
      })
      .then(function (existingIncome) {
        if (existingIncome != null) {
          return db.Income.update({amount: request.payload.amount}, {where: {id: existingIncome.dataValues.id}})
          .then(function () {
            return db.Income.findOne({where: {id: existingIncome.dataValues.id}})
          })
        } else {
          return db.Income.create({id: uuid.v4(), userId: savedUser.id, month: currentMonth, amount: request.payload.amount})
        }
      })
      .then(function (income) {
        reply({income: income.dataValues})
      })
      .catch(function (err) {
        logger(err)
        reply(err)
      })
    }
  })

  db.Income = db.define('Income', {
    id: {type: Sequelize.UUID, primaryKey: true},
    userId: {type: Sequelize.INTEGER, allowNull: false},
    month: {type: Sequelize.STRING, allowNull: false},
    amount: {type: Sequelize.INTEGER, allowNull: false}
  }, {
    freezeTableName: true
  })

  return db.Income.sync()
}
