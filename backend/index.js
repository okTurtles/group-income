global.Promise = require('bluebird') // TODO: get rid of this since we're using babel?
global.logger = function (err) { // Improve this later
  console.error(err)
  console.error(err.stack)
}
var Hapi = require('hapi')
var cookie = require('hapi-auth-cookie')
var corsHeaders = require('hapi-cors-headers')

var server = new Hapi.Server({
  // TODO: improve logging and base it on process.env.NODE_ENV
  debug: { request: ['error'], log: ['error'] }
  // connections: {routes: {cors: cors}},
})
server.connection({
  port: process.env.API_PORT
  // host: '0.0.0.0', routes: { cors: cors }
})
server.ext('onPreResponse', corsHeaders)
server.register(cookie, function (err) {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  server.auth.strategy('cookie_strategy', 'cookie', {
    password: 'abcdef', // TODO: must be >= 32 chars: https://github.com/hapijs/hapi/issues/3040
    cookie: 'group-income-simple',
    ttl: 2592000000, // 1 month
    isSecure: false // HTTP allowed
  })
})

var Sequelize = require('sequelize')
var db = new Sequelize('sqlite.db', '', '', {
  dialect: 'sqlite',
  // TODO this litters the local directory with a database file called sqlite.db, which is not ideal.
  storage: process.argv.indexOf('test') !== -1 ? 'sqlite.db' : ':memory:'
})

module.exports = Promise.resolve()
.then(() => require('./user')(server, Sequelize, db))
.then(() => require('./session')(server, Sequelize, db))
.then(() => require('./group')(server, Sequelize, db))
.then(() => require('./userGroup')(server, Sequelize, db))
.then(() => require('./invite')(server, Sequelize, db))
.then(() => require('./income')(server, Sequelize, db))
.then(function () {
  db.User.hasMany(db.Session, {foreignKey: {name: 'userId', allowNull: false}, constraints: true})
  db.Session.belongsTo(db.User, {foreignKey: {name: 'userId', allowNull: false}, constraints: true})

  db.User.hasMany(db.UserGroup, {foreignKey: {name: 'userId', allowNull: false}, constraints: true})
  db.UserGroup.belongsTo(db.User, {foreignKey: {name: 'userId', allowNull: false}, constraints: true})

  db.Group.hasMany(db.UserGroup, {foreignKey: {name: 'groupId', allowNull: false}, constraints: true})
  db.UserGroup.belongsTo(db.Group, {foreignKey: {name: 'groupId', allowNull: false}, constraints: true})

  db.Group.hasMany(db.Invite, {foreignKey: {name: 'groupId', allowNull: false}, constraints: true})
  db.Invite.belongsTo(db.Group, {foreignKey: {name: 'groupId', allowNull: false}, constraints: true})
  db.Invite.belongsTo(db.User, {foreignKey: {name: 'creatorId', allowNull: false}, constraints: true})

  return db.sync()
})
.then(() => server.start())
.then(() => console.log('Server running at:', server.info.uri))
