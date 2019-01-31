/* globals logger */

'use strict'

// primus events: https://github.com/primus/primus#events
// https://github.com/primus/primus-emit (better than primus-emitter)

import { bold } from 'chalk'
import { RESPONSE_TYPE } from '../shared/constants.js'
import { makeResponse as reply } from '../shared/functions.js'
import Primus from 'primus'

const { ERROR, SUCCESS, SUB, UNSUB, PUB } = RESPONSE_TYPE

// generate and save primus client file
// https://github.com/primus/primus#client-library
// this function is also used in .Grunfile.babel.js
// to save the corresponding frontend version of the primus.js file
export function setupPrimus (server: Object, saveAndDestroy: boolean = false) {
  var primus = new Primus(server, {
    transformer: 'websockets',
    rooms: { wildcard: false }
  })
  primus.plugin('rooms', require('primus-rooms'))
  primus.plugin('responder', require('primus-responder'))
  if (saveAndDestroy) {
    primus.save(require('path').join(__dirname, '../frontend/simple/controller/utils/primus.js'))
    primus.destroy()
  }
  return primus
}

// TODO: decide whether it's better to switch to HTTP2 intead of using websockets — NOTE: it probably is (makes it easier to self-host? also more sbp-friendly single-api-endpoint design?)
// https://www.reddit.com/r/rust/comments/5p6a8z/a_hyper_update_v010_last_week_tokio_soon/
//
// NOTE: primus-rooms can be used with primus-multiplex
//       primus-multiplex makes it so that the server can have
//       multiple channels, and each channel then can have multiple rooms.
// https://github.com/cayasso/primus-multiplex/blob/master/examples/node/rooms/index.js

export default function (hapi: Object) {
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
    const { id, address } = spark
    // console.log('connection has the following headers', headers)
    console.log(bold(`[pubsub] ${id} connected from:`), address)

    // https://github.com/swissmanu/primus-responder
    spark.on('request', async function (req, done) {
      try {
        var { type, data: { contractID } } = req
        var success = reply(SUCCESS, { type, id })
        console.log(bold(`[pubsub] REQUEST '${type}' from '${id}'`), req)
        switch (type) {
          case SUB:
            if (spark.rooms().indexOf(contractID) === -1) {
              spark.join(contractID, function () {
                spark.room(contractID).except(id).write(req)
                done(success)
              })
            } else {
              console.log(`[pubsub] ${id} already subscribed to: ${contractID}`)
              done(success)
            }
            break
          case UNSUB:
            spark.room(contractID).except(id).write(req)
            spark.leave(contractID, () => done(success))
            break
          case PUB:
            spark.room(contractID).except(id).write(req)
            break
          default:
            console.error(bold.red(`[pubsub] client ${id} didn't give us a valid type!`), req)
            spark.leaveAll()
            done(reply(ERROR, `invalid type: ${type}`))
            spark.end()
        }
      } catch (err) {
        logger(err)
        done(reply(ERROR, err))
      }
    })
    spark.on('leaveallrooms', (rooms) => {
      console.log(bold.yellow(`[pubsub] ${id} leaveallrooms`))
      // this gets called on spark.leaveAll and 'disconnection'
      rooms.forEach(contractID => {
        primus.room(contractID).write(reply(UNSUB, { contractID, id }))
      })
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
