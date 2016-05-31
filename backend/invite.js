/* globals logger */

import {server, db} from './setup'

var Joi = require('joi')
var uuid = require('node-uuid')
var email = require('./helpers/email')
var Sequelize = require('Sequelize')

server.route({
  config: {
    auth: 'gi-auth',
    validate: {
      payload: {
        groupId: Joi.number().integer().min(1).required(),
        email: Joi.string().email().required()
      }
    }
  },
  method: 'POST',
  path: '/invite/',
  handler: function (request, reply) {
    var userId = request.auth.credentials.userId
    var groupId = request.payload.groupId

    db.UserGroup.count({where: {userId: userId, groupId: groupId}})
    .then(function (count) {
      if (count < 1) return Promise.reject(new Error('Must be a member of the group to invite'))

      return db.Invite.create({
        id: uuid.v4(),
        groupId: groupId,
        creatorId: userId,
        email: request.payload.email,
        completed: null})
    })
    .then(function (invite) {
      var link = process.env.API_URL + '/invite/' + invite.dataValues.id + '/accept'
      email.send(request.payload.email,
        'You\'ve been invited to join a group on Group Income',
        'Click this link: ' + link)
      reply({link: link, invite: invite.dataValues})
    })
    .catch(function (err) {
      logger(err)
      reply(err)
    })
  }
})

server.route({
  config: {
    validate: {
      params: {
        invite: Joi.string().min(36).max(36).required()
      }
    }
  },
  method: 'POST',
  path: '/invite/{invite}/accept',
  handler: function (request, reply) {
    // TODO: Check raw headers, if a cookie is present
    // AND it doesn't match the invitation email, clear the session data
    // and exit immediately with an error
    var savedInvite = null

    db.Invite.findOne({where: {id: request.params.invite}, include: db.Group})
    .then(function (invite) {
      savedInvite = invite.dataValues

      return db.User.findOne({where: {email: invite.dataValues.email}})
    })
    .then(function (user) {
      if (user == null) { // new account
        var redirect = process.env.FRONTEND_URL + '/register.html?invite=' + request.params.invite
        reply({redirect: redirect}).redirect(redirect)
      } else { // already exists
        return db.UserGroup.create({userId: user.dataValues.id, groupId: savedInvite.BIGroup.dataValues.id})
        .then(function (association) {
          reply({association: association.dataValues})
        })
      }
    })
    .catch(function (err) {
      logger(err)
      reply(err)
    })
  }
})

db.Invite = db.define('Invite', {
  id: {type: Sequelize.UUID, primaryKey: true},
  groupId: {type: Sequelize.INTEGER, allowNull: false},
  creatorId: {type: Sequelize.INTEGER, allowNull: false},
  email: {type: Sequelize.STRING, allowNull: false},
  completed: {type: Sequelize.DATE, allowNull: true}
}, {
  freezeTableName: true
})

module.exports = db.Invite.sync()
