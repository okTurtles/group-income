// TODO: delete this file, it's no longer being used

import {db} from './setup'

var Sequelize = require('Sequelize')

db.UserGroup = db.define('UserGroup', {
  userId: {type: Sequelize.STRING, allowNull: false},
  groupId: {type: Sequelize.INTEGER, allowNull: false}
}, {
  freezeTableName: true
})
