import {server, db} from './setup'

// Sequelize already uses bluebird, so we might as well take advantage of those APIs
global.Promise = require('bluebird')
// TODO: use Bluebird to handle swallowed errors (combine with Good logging?)
//       http://jamesknelson.com/are-es6-promises-swallowing-your-errors/
global.logger = function (err) { // Improve this later
  console.error(err)
  console.error(err.stack)
}

module.exports = (async function () {
  require('./user')
  require('./group')
  require('./invite') // TODO: get rid of this too?
  require('./income')
  // http://docs.sequelizejs.com/en/latest/docs/associations/
  // adds getUsers, setUsers, addUser, addUsers to Group
  // getGroups, setGroups, addGroup, and addGroups to User
  db.User.belongsToMany(db.Group, {through: 'UserGroup', allowNull: false})
  db.Group.belongsToMany(db.User, {through: 'UserGroup', allowNull: false})
  // see 'Target keys': http://docs.sequelizejs.com/en/latest/docs/associations/#belongsto
  // adds creatorId to Invite which points to User's primary key
  db.Invite.belongsTo(db.User, {foreignKey: 'creatorId', allowNull: false})
  db.Invite.belongsTo(db.Group, {foreignKey: 'groupId', allowNull: false}) // adds groupId to Invite

  db.Income.belongsTo(db.User, {foreignKey: 'userId', allowNull: false})

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
