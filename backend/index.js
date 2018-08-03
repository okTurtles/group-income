import chalk from 'chalk'
import * as db from './database'
import * as server from './server'

// TODO: use Bluebird to handle swallowed errors (combine with Good logging?)
//       http://jamesknelson.com/are-es6-promises-swallowing-your-errors/
global.Promise = require('bluebird')
// TODO: improve logging: https://github.com/okTurtles/group-income-simple/issues/32
global.logger = function (err) {
  console.error(err)
  console.error(err.stack)
}

module.exports = Promise.all([db.loaded, server.loaded]).then(() => {
  console.log(chalk.bold('backend startup sequence complete.'))
})

// when spawned via grunt, listen for message to cleanly shutdown and relinquish port
process.on('message', function () {
  console.log('message received in child, shutting down...')
  var primus = server.hapi.primus
  primus.on('close', async function () {
    try {
      await server.hapi.stop()
      console.log('Hapi server down')
      // await db.stop()
      // console.log('database stopped')
      process.send({}) // tell grunt we've successfully shutdown the server
      process.nextTick(() => process.exit(0)) // triple-check we quit :P
    } catch (err) {
      console.error('Error during shutdown:', err)
      process.exit(1)
    }
  })
  primus.destroy({timeout: 1000}) // TODO: close: false ?
})
