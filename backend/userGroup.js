module.exports = function (server, Sequelize, db) {
  db.UserGroup = db.define('UserGroup', {
    userId: {type: Sequelize.INTEGER, allowNull: false},
    groupId: {type: Sequelize.INTEGER, allowNull: false}
  }, {
    freezeTableName: true
  })

  return db.UserGroup.sync()
}
