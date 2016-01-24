global.Promise = require('bluebird')
var Hapi = require('hapi')
var server = new Hapi.Server()
server.connection({port: 3000})

var Sequelize = require('sequelize')
var db = new Sequelize('sqlite.db', '', '', {
  dialect: 'sqlite',
  host: 'sqlite.db'
})

Promise.resolve()
.then(function () {require('./user')(server, Sequelize, db)})
.then(function () {require('./group')(server, Sequelize, db)})
.then(function () {
  db.User.hasMany(db.Group, {foreignKey: {name: 'creator', allowNull: false}, constraints: true})
  db.Group.belongsTo(db.User, {foreignKey: {name: 'creator', allowNull: false}, constraints: true})
  return db.sync()
})
.then(function () {
  server.start(function () {
    console.log('Server running at:', server.info.uri)
  })
})
