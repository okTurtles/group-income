/* globals logger */

import {server, db} from './setup'

var Joi = require('joi')
var uuid = require('node-uuid')
var moment = require('moment')
var Sequelize = require('Sequelize')

server.route({
  config: {
    auth: 'gi-auth',
    validate: {
      payload: {
        amount: Joi.number().integer().min(1).required()
      }
    }
  },
  method: 'POST',
  path: '/income/',
  handler: async function (request, reply) {
    try {
      var currentMonth = moment().format('MM-Y')
      var amount = request.payload.amount
      var userId = request.auth.credentials.userId
      var [income, created] = await db.Income.findOrCreate({
        where: {userId: userId, month: currentMonth}, defaults: {amount: amount}
      })
      if (!created) await income.update({amount: amount})
      reply({income: income.toJSON()})
    } catch (err) {
      logger(err)
      reply(err)
    }
  }
})

db.Income = db.define('Income', {
  // id: {type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4},
  // For whatever reason Sequelize.UUIDV4 results in findOrCreate throwing a
  // bizarre error related to "val.replace is not a function"
  id: {type: Sequelize.UUID, primaryKey: true, defaultValue: uuid.v4},
  // userId is added via foreign key in index.js
  month: {type: Sequelize.STRING, allowNull: false},
  amount: {type: Sequelize.INTEGER, allowNull: false}
}, {
  freezeTableName: true
})
