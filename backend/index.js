global.Promise = require('bluebird')
// TODO: use Bluebird to handle swallowed errors (combine with Good logging?)
//       http://jamesknelson.com/are-es6-promises-swallowing-your-errors/
// TODO: improve logging: https://github.com/okTurtles/group-income-simple/issues/32
global.logger = function (err) {
  console.error(err)
  console.error(err.stack)
}

import {loaded as db} from './database'
import {loaded as server} from './server'

module.exports = Promise.all([db, server])

// when spawned via grunt, listen for message to cleanly shutdown and relinquish port
process.on('message', () => {
  console.log('message received in child, shutting down...')
  server.stop()
  .then(() => {
    console.log('Hapi server down')
    process.send({}) // tell grunt we've successfully shutdown the server
    process.nextTick(() => process.exit(0)) // triple-check we quit :P
  })
  .catch((err) => {
    console.error('Error shutting down:', err)
    process.exit(1)
  })
})
