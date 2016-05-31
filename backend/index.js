import {server, db} from './setup'

// Sequelize already uses bluebird, so we might as well take advantage of those APIs
var Promise = global.Promise = require('bluebird')
// TODO: use Bluebird to handle swallowed errors (combine with Good logging?)
//       http://jamesknelson.com/are-es6-promises-swallowing-your-errors/
global.logger = function (err) { // Improve this later
  console.error(err)
  console.error(err.stack)
}

module.exports = (async function () {
  await Promise.all([
    require('./user'),
    require('./session'), // TODO: get rid of this session stuff
    require('./group'),
    require('./userGroup'),
    require('./invite'),
    require('./income')
  ])
  db.User.hasMany(db.Session, {foreignKey: {name: 'userId', allowNull: false}, constraints: true})
  db.Session.belongsTo(db.User, {foreignKey: {name: 'userId', allowNull: false}, constraints: true})

  db.User.hasMany(db.UserGroup, {foreignKey: {name: 'userId', allowNull: false}, constraints: true})
  db.UserGroup.belongsTo(db.User, {foreignKey: {name: 'userId', allowNull: false}, constraints: true})

  db.Group.hasMany(db.UserGroup, {foreignKey: {name: 'groupId', allowNull: false}, constraints: true})
  db.UserGroup.belongsTo(db.Group, {foreignKey: {name: 'groupId', allowNull: false}, constraints: true})

  db.Group.hasMany(db.Invite, {foreignKey: {name: 'groupId', allowNull: false}, constraints: true})
  db.Invite.belongsTo(db.Group, {foreignKey: {name: 'groupId', allowNull: false}, constraints: true})
  db.Invite.belongsTo(db.User, {foreignKey: {name: 'creatorId', allowNull: false}, constraints: true})

  await db.sync()
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
