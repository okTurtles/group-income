// Sequelize already uses bluebird, so we might as well take advantage of those APIs
global.Promise = require('bluebird')
// TODO: use Bluebird to handle swallowed errors (combine with Good logging?)
//       http://jamesknelson.com/are-es6-promises-swallowing-your-errors/
global.logger = function (err) { // Improve this later
  console.error(err)
  console.error(err.stack)
}

import {server, db} from './setup'

module.exports = (async function () {
  await db.loaded
  require('./user')
  require('./group')
  require('./invite') // TODO: get rid of this too?
  require('./income')
  await server.start()
  console.log('API server running at:', server.info.uri)
})() // returns a promise that's either rejected or resolved

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
