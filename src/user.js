module.exports = function (server, Sequelize, db) {
  server.route({
    method: 'GET',
    path: '/user/{user}',
    handler: function (request, reply) {
        reply('Hello ' + request.params.user)
    }
  })

  var User = db.define('user', {
    firstName: {type: Sequelize.STRING},
    lastName: {type: Sequelize.STRING}
  }, {
    freezeTableName: true
  })

  return User.sync()
}
