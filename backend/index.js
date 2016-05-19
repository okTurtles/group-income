// Bluebird adds many convenient APIs: http://bluebirdjs.com/docs/api-reference.html
// Sequelize already uses bluebird, so we might as well take advantage of those APIs
// Bluebird's promises are better designed and have fewer issues than native ones:
// http://jamesknelson.com/are-es6-promises-swallowing-your-errors/
global.Promise = require('bluebird')

var logger = global.logger = function (err) { // Improve this later
  console.error(err)
  console.error(err.stack)
}
var Hapi = require('hapi')
var cookie = require('hapi-auth-cookie')

var server = new Hapi.Server({
  // TODO: improve logging and base it on process.env.NODE_ENV
  debug: { request: ['error'], log: ['error'] }
})
server.connection({
  port: process.env.API_PORT,
  // See: https://github.com/hapijs/discuss/issues/262#issuecomment-204616831
  routes: { cors: { origin: [process.env.FRONTEND_URL] } }
})
server.register(cookie, function (err) {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  server.auth.strategy('cookie_strategy', 'cookie', {
    // must be >= 32 chars: https://github.com/hapijs/hapi/issues/3040
    password: 'abcdefabcdefabcdefabcdefabcdefabcdef',
    cookie: 'group-income-simple',
    ttl: 2592000000, // 1 month
    isSecure: false // HTTP allowed
  })
})

var Sequelize = require('sequelize')
var db = new Sequelize('database', '', '', {
  dialect: 'sqlite',
  // TODO: find better location for sqlite.db file
  storage: process.argv.indexOf('test') !== -1 ? 'sqlite.db' : ':memory:'
})

module.exports = Promise.resolve()
.then(() => require('./user')(server, Sequelize, db)) // implicit return arrow syntax
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
.catch((err) => {
  console.error('Server failed to start!')
  logger(err)
  process.exit(1)
})

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
