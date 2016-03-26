require('dotenv').load()
global.Promise = require('bluebird')
global.logger = function (err) { // Improve this later
  console.error(err)
  console.error(err.stack)
}
var Hapi = require('hapi')
var cookie = require('hapi-auth-cookie')
var server = new Hapi.Server()
server.connection({port: 3000})
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
  host: 'sqlite.db'
})

Promise.resolve()
.then(function () { require('./user')(server, Sequelize, db) })
.then(function () { require('./session')(server, Sequelize, db) })
.then(function () { require('./group')(server, Sequelize, db) })
.then(function () { require('./userGroup')(server, Sequelize, db) })
.then(function () { require('./invite')(server, Sequelize, db) })
.then(function () { require('./income')(server, Sequelize, db) })
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
.then(function () {
  server.start(function () {
    console.log('Server running at:', server.info.uri)
  })
})
