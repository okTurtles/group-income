/* globals logger */

import {server, db} from './setup'

var Joi = require('joi')
var moment = require('moment')

server.route({
  config: {
    auth: 'gi-auth',
    validate: { payload: {
      amount: Joi.number().integer().min(1).required()
    } }
  },
  method: 'POST',
  path: '/income/',
  handler: async function (request, reply) {
    try {
      var currentMonth = moment().format('MM-Y')
      var amount = request.payload.amount
      var userId = request.auth.credentials.userId
      // TODO: this needs to be wrapped in a transaction
      //       (might need to use Offshore since Waterline doesn't support it atm)
      var income = await db.Income.findOrCreate(
        {userId: userId, month: currentMonth},
        {userId: userId, month: currentMonth, amount: amount}
      )
      if (income.amount !== amount) {
        income.amount = amount
        await income.save()
      }
      reply({income: income.toJSON()})
    } catch (err) {
      logger(err)
      reply(err)
    }
  }
})
