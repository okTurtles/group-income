/* globals logger */

'use strict'

// primus events: https://github.com/primus/primus#events
// https://github.com/primus/primus-emit (better than primus-emitter)

import {bold} from 'chalk'
import {RESPONSE_TYPE} from '../shared/constants'
import {makeResponse, setupPrimus} from '../shared/functions'

const {ERROR, SUCCESS, JOINED, LEFT} = RESPONSE_TYPE

// TODO: decide whether it's better to switch to HTTP2 intead of using websockets
// https://www.reddit.com/r/rust/comments/5p6a8z/a_hyper_update_v010_last_week_tokio_soon/
//
// NOTE: primus-rooms can be used with primus-multiplex
//       primus-multiplex makes it so that the server can have
//       multiple channels, and each channel then can have multiple rooms.
// https://github.com/cayasso/primus-multiplex/blob/master/examples/node/rooms/index.js

module.exports = function (hapi: Object) {
  var primus = setupPrimus(hapi.listener)
  // make it possible to access primus via: hapi.primus
  hapi.decorate('server', 'primus', primus)

  primus.on('roomserror', function (error, spark) {
    console.log(bold.red('Rooms error from ' + spark.id), error)
  })
  primus.on('joinroom', function (room, spark) {
    console.log(bold.yellow(spark.id + ' joined ' + room))
  })

  primus.on('connection', function (spark) {
    // spark is the new connection. https://github.com/primus/primus#sparkheaders
    const {id, address} = spark
    // console.log('connection has the following headers', headers)
    console.log(bold(`[pubsub] ${id} connected from:`), address)

    // https://github.com/swissmanu/primus-responder
    spark.on('request', async function (data, done) {
      var {groupId, action} = data
      var success = makeResponse(SUCCESS, {action, id})
      console.log(bold(`[pubsub] ACTION '${action}' from '${id}' with data:`), data)
      try {
        switch (action) {
          case 'sub':
            spark.join(groupId, function () {
              spark.on('leaveallrooms', (rooms) => {
                console.log(bold.yellow(`[pubsub] ${id} leaveallrooms`))
                // this gets called on spark.leaveAll and 'disconnection'
                rooms.forEach(groupId => {
                  primus.room(groupId).write(makeResponse(LEFT, {groupId, id}))
                })
              })
              spark.room(groupId).except(id).write(makeResponse(JOINED, {groupId, id}))
              done(success)
            })
            break
          case 'unsub':
            spark.room(groupId).except(id).write(makeResponse(LEFT, {groupId, id}))
            spark.leave(groupId, () => done(success))
            break
          default:
            console.error(bold.red(`[pubsub] client ${id} didn't give us a valid action!`), data)
            spark.leaveAll()
            done(makeResponse(ERROR, `invalid action: ${action}`))
            spark.end()
        }
      } catch (err) {
        done(makeResponse(ERROR, {action: action || null}, err))
        logger(err)
      }
    })

    spark.on('data', function (data) {
      console.log(bold.red('[pubsub] received UNHANDLED DATA from client:', data))
    })
  })

  primus.on('disconnection', function (spark) {
    // the spark that disconnected
    console.log(bold.yellow(`[pubsub] ${spark.id} disconnection`))
  })
}
