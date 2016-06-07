// lodash not lodash-es; see pathmodify in .Gruntfile.babel.js
import _ from 'lodash'

const uuid = require('node-uuid')
const Waterline = require('waterline')
const waterline = new Waterline()

var config = {
  adapters: {
    // TODO: process.argv.indexOf('test') !== -1 ? 'sqlite.db' : ':memory:'
    memory: require('sails-memory')
  },
  connections: {
    default: {adapter: 'memory'}
  }
}

// TODO: It is extremely important to set the migrate property to safe in your models when working with existing databases.
// https://github.com/balderdashy/waterline-docs/blob/master/models/models.md#using-an-existing-database
// Validation rules: https://github.com/balderdashy/waterline-docs/blob/master/models/validations.md
var schema = _.reduce({
  // TODO: check out beforeCreate/afterCreate:
  //       https://github.com/balderdashy/waterline-docs/blob/master/models/lifecycle-callbacks.md
  Group: {
    // types: https://github.com/balderdashy/waterline-docs/blob/master/models/data-types-attributes.md
    name: {type: 'string', unique: true, required: true},
    // https://github.com/balderdashy/waterline-docs/blob/master/models/associations/many-to-many.md
    users: {collection: 'user', via: 'groups'}
  },
  User: {
    id: {type: 'string', primaryKey: true, required: true},
    name: {type: 'string', unique: true, required: true},
    password: {type: 'string', required: true},
    contriGL: {type: 'integer', required: true},
    contriRL: {type: 'integer', required: true},
    // optional
    email: {type: 'string'},
    phone: {type: 'string'},
    payPaypal: {type: 'string'},
    payBitcoin: {type: 'string'},
    payVenmo: {type: 'string'},
    payInstructions: {type: 'string'},
    // reference to Group
    groups: {collection: 'group', via: 'users'}
  },
  Income: {
    id: {type: 'string', primaryKey: true, defaultsTo: uuid.v4},
    month: {type: 'string', required: true},
    amount: {type: 'integer', required: true},
    // foreign key, https://github.com/balderdashy/waterline-docs/blob/master/models/associations/one-to-one.md
    user: {model: 'user'}
  },
  Invite: {
    id: {type: 'string', primaryKey: true, defaultsTo: uuid.v4},
    email: {type: 'string', required: true},
    completed: {type: 'date'},
    // foreign keys
    creator: {model: 'user'},
    group: {model: 'group'}
  }
}, (result, value, key) => {
  // see other Model config values here:
  // https://github.com/balderdashy/waterline-docs/blob/master/models/configuration.md
  result[key] = Waterline.Collection.extend({
    identity: key.toLowerCase(), connection: 'default', attributes: value,
    autoPK: !_.find(value, _.matches({primaryKey: true}))
  })
  waterline.loadCollection(result[key])
  return result
}, {})

export var db = {
  loaded: new Promise((resolve, reject) => {
    // https://github.com/balderdashy/waterline-docs/blob/master/introduction/getting-started.md
    waterline.initialize(config, function (err, ontology) {
      if (err) {
        console.error('Waterline.initialize', err)
        reject(err)
      } else {
        _.forOwn(schema, (v, k) => {
          db[k] = ontology.collections[k.toLowerCase()]
        })
        resolve()
      }
    })
  })
}
