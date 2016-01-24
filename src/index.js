global.Promise = require('bluebird')
var Hapi = require('hapi')
var server = new Hapi.Server()
server.connection({port: 3000})

var Sequelize = require('sequelize')
var db = new Sequelize('sqlite.db', '', '', {
  dialect: 'sqlite',
  host: 'sqlite.db'
})

Promise.all([
  require('./user')(server, Sequelize, db)
])
.then(function () {return db.sync()})
.then(function () {
  server.start(function () {
    console.log('Server running at:', server.info.uri)
  })
})
