import Knex from 'knex'
import {Model, transaction} from 'objection'
import multihash from 'multihashes'

// TODO: consider using https://github.com/flumedb/flumedb

// Initialize knex connection.
const knex = Knex({
  client: 'sqlite3',
  connection: {
    filename: process.env.NODE_ENV === 'production' ? 'groupincome.db' : ':memory:'
  },
  useNullAsDefault: true
})

Model.knex(knex)

// =======================
// Models
// =======================

// Optional validation based on ajv library. This is not a database
// schema. Nothing is generated based on this!
// https://github.com/epoberezkin/ajv/blob/master/COERCION.md
export class HashToData extends Model {
  static tableName = 'HashToData'
  static jsonSchema = {
    type: 'object',
    required: ['value'],
    properties: {
      id: {type: 'integer'},
      hash: {type: 'string'},
      value: {type: 'string'}
    }
  }
  $beforeInsert (context) { // https://vincit.github.io/objection.js/#context
    if (!this.hash) {
      // use multihash.Buffer in the browser
      var buff = multihash.encode(Buffer.from(this.value), 'blake2b')
      this.hash = multihash.toB58String(buff)
    }
  }
  $beforeValidate (jsonSchema, data, opt) {
    if (typeof data.value === 'object') {
      data.value = JSON.stringify(data.value)
    }
    return jsonSchema // required
  }
}

// See also https://vincit.github.io/objection.js/#virtualattributes
export class Log extends Model {
  static _tableName = 'Log'
  static get tableName () { return this._tableName }
  static set tableName (name) { this._tableName = `Log_${name.substr(-5, 5)}` }
  static jsonSchema = {
    type: 'object',
    required: ['entry'],
    properties: {
      id: {type: 'integer'},
      entry: {
        type: 'object',
        properties: {
          version: {type: 'string'},
          parentHash: {type: ['string', 'null']},
          data: {type: 'object'}
        }
      },
      created_at: {type: 'string'}
    }
  }
  static table (name) {
    this.tableName = name
    return this.query()
  }
  $beforeInsert (ctx) { this.created_at = new Date().toISOString() }
}

export class Groups extends Model {
  static tableName = 'Groups'
  static jsonSchema = {
    type: 'object',
    required: ['table'],
    properties: {
      id: {type: 'string'},
      table: {type: 'string'}
    }
  }
}

// =======================
// wrapper methods to add log entries / create groups
// =======================

export async function createGroup (entry) {
  console.log('insterting:', entry)
  var content = await HashToData.query().insert({value: entry})
  console.log('inserted:', content)
  var groupId = content.hash
  Log.tableName = groupId // get chomped tableName based on groupId
  var table = Log.tableName
  await knex.schema.createTableIfNotExists(table, function (table) {
    table.increments()
    table.text('entry').notNullable()
    table.dateTime('created_at').notNullable()
  })
  var res = await transaction(Groups, Log, async function (Groups, Log) {
    console.log(`created table: ${groupId}.Log`)
    await Groups.query().insert({id: groupId, table})
    console.log('inserted group:', groupId)
    await Log.table(groupId).insert({entry})
    console.log('inserted log entry:', entry)
  })
  // TODO: get rid of this debugging or convert it to events using Good
  console.log('transaction completed with result:', res)
  return Promise.resolve(groupId)
}

export async function appendLogEntry (groupId, entry) {
  var res = await transaction(HashToData, Log, async function (HashToData, Log) {
    await HashToData.query().insert({value: entry})
    var log = await Log.table(groupId).insert({entry})
    console.log('last log:', log)
  })
  console.log('transaction completed with result:', res) // TODO: same as above
  return Promise.resolve(res)
}

export async function fetchEntriesSince (groupId, opts) {
  // TODO: this. use http://knexjs.org/#Interfaces-Streams
  if (opts.timestamp) {
    // based on created_at
  } else if (opts.entryNum) {
    // based on id
  } else {
    throw new Error('opts.timestamp or opts.entryNum required!')
  }
}

export async function lastEntry (groupId) {
  return Log.table(groupId).findById(Log.table(groupId).max('id'))
}

// Create tables and return a promise that the importing file can wait on
export const loaded = knex.schema
  .createTableIfNotExists('HashToData', function (table) {
    table.increments()
    table.text('hash').notNullable()
    table.text('value').notNullable()
  }).createTableIfNotExists('Groups', function (table) {
    table.text('id').primary()
    table.text('table').notNullable()
  })

// =======================
// Test
// =======================

const testDatabaseJs = false

if (testDatabaseJs) {
  (async function () {
    await loaded
    var entry = {
      version: '0',
      parentHash: null,
      data: {
        hello: 'world!',
        pubkey: 'foobarbaz'
      }
    }
    var groupId = await createGroup(entry)
    console.log('created group:', groupId)

    entry.data = {crazy: 'lady'}
    var res = await appendLogEntry(groupId, entry)
    console.log(`added log entry ${entry.data} with result:`, res)
    res = await lastEntry(groupId)
    console.log(`last log entry for ${groupId}:`, res)

    knex.destroy()
    process.exit(0)
  })()
}
