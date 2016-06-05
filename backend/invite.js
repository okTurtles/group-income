/* globals logger */

'use strict'

import {server, db} from './setup'

const Joi = require('joi')
const uuid = require('node-uuid')
const email = require('./helpers/email')
const Boom = require('boom')

server.route({
  config: {
    auth: 'gi-auth',
    validate: { payload: {
      groupId: Joi.number().integer().min(1).required(),
      email: Joi.string().email().required()
    } }
  },
  method: 'POST',
  path: '/invite/',
  handler: async function (request, reply) {
    try {
      var userId = request.auth.credentials.userId
      var groupId = request.payload.groupId

      var group = await db.Group.findOne(groupId).populate('users', {id: userId})
      if (!group) return reply(Boom.notFound('no such group'))
      if (!group.users.length) return reply(Boom.unauthorized('Must be a member of the group to invite'))

      var invite = await db.Invite.create({
        id: uuid.v4(),
        groupId: groupId,
        creatorId: userId,
        email: request.payload.email,
        completed: null
      })
      var link = `${process.env.API_URL}/invite/${invite.id}/accept`
      email.send(request.payload.email, "You've been invited to join a group on Group Income", `Click this link: ${link}`)
      reply({link: link, invite: invite.toJSON()})
    } catch (err) {
      logger(err)
      reply(err)
    }
  }
})
/*
TODO: I started to rewrite this in terms of Waterline & async/await,
      but it really doesn't make sense given that we're now doing
      in-app invites (i.e. no email link thingy).
      We should totally change this and create new tests for it that
      do make sense.
server.route({
  config: {
    validate: { params: {
      invite: Joi.string().min(36).max(36).required()
    } }
  },
  method: 'POST',
  path: '/invite/{invite}/accept',
  handler: async function (request, reply) {
    try {
      var invite = await db.Invite.findOne(request.params.invite).populate('creator')

      .then(function (invite) {
        savedInvite = invite.dataValues

        return db.User.findOne({where: {email: invite.dataValues.email}})
      })
      .then(function (user) {
        if (user == null) { // new account
          var redirect = process.env.FRONTEND_URL + '/register.html?invite=' + request.params.invite
          reply({redirect: redirect}).redirect(redirect)
        } else { // already exists
          return user.addGroup(savedInvite.groupId).then(reply)
          // return db.UserGroup.create({userId: user.dataValues.id, groupId: savedInvite.BIGroup.dataValues.id})
          // .then(function (association) {
          //   reply({association: association.dataValues})
          // })
        }
      })
    } catch (err) {
      logger(err)
      reply(err)
    }
  }
})
*/
