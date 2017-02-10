'use strict'

import Knex from 'knex'
import fs from 'fs'
import {Model, transaction, ValidationError} from 'objection'
import {HashableEntry, Group} from '../shared/events'

const production = process.env.NODE_ENV === 'production'

// delete the test database if it exists
!production && fs.existsSync('test.db') && fs.unlinkSync('test.db')

// Initialize knex connection.
const knex = Knex({
  client: 'sqlite3',
  connection: {
    filename: production ? 'groupincome.db' : 'test.db'
  },
  useNullAsDefault: true
})

Model.knex(knex)

// Create tables and return a promise that the importing file can wait on
export const loaded = knex.schema
  .createTableIfNotExists('HashToData', function (table) {
    table.text('hash').primary()
    table.text('value').notNullable()
  })
  .createTableIfNotExists('Namespace', function (table) {
    table.text('name').primary()
    table.text('value').notNullable()
  })

// =======================
// Models
// =======================

// Optional validation based on ajv library. This is not a database
// schema. Nothing is generated based on this!
// https://github.com/epoberezkin/ajv/blob/master/COERCION.md
class HashToData extends Model {
  static tableName = 'HashToData'
  static idColumn = 'hash'
  static jsonSchema = {
    type: 'object',
    required: ['hash', 'value'],
    properties: {
      hash: {type: 'string'},
      value: {type: 'string'}
    }
  }
}

class Namespace extends Model {
  static tableName = 'Namespace'
  static idColumn = 'name'
  static jsonSchema = {
    type: 'object',
    required: ['name', 'value'],
    properties: {
      name: {type: 'string'},
      value: {type: 'string'}
    }
  }
}

// See also https://vincit.github.io/objection.js/#virtualattributes
class Log extends Model {
  static tableName = 'Log'
  static jsonSchema = {
    type: 'object',
    required: ['version', 'type', 'parentHash', 'data', 'hash'],
    properties: {
      id: {type: 'integer'},
      version: {type: 'string'},
      type: {type: 'string'},
      parentHash: {type: ['string', 'null']},
      data: {type: 'object'},
      hash: {type: 'string'}
    }
  }
  static table (name) {
    this.tableName = name
    // even though calling .table on the query is probably not necessary since
    // it copies it from this.tableName upon creation, we do it anyway just to
    // be absolutely certain that this query is associated with this table name
    // https://vincit.github.io/objection.js/#context
    return this.query().context({onBuild: builder => builder.table(name)})
  }
  $beforeInsert () {
    console.log(`[Log] ${Log.tableName} INSERT:`, this.toJSON())
  }
}

// =======================
// wrapper methods to add log entries / create groups
// =======================

export async function createLog (
  groupId: string,
  entry: HashableEntry
): Promise<string> {
  // TODO: add proper debugging events using Good
  if (entry.parentHash) throw new Error('parentHash must be null!')
  await HashToData.query().insert({hash: groupId, value: entry.toJSON()})
  await knex.schema.createTableIfNotExists(groupId, function (table) {
    table.increments()
    table.text('version').notNullable()
    table.text('type').notNullable()
    table.text('parentHash')
    table.text('data').notNullable()
    table.text('hash').notNullable().index()
  })
  await Log.table(groupId).insert({...entry.toObject(), hash: groupId})
  console.log('createLog():', groupId, entry)
  return groupId
}

export async function appendLogEntry (
  groupId: string,
  entry: HashableEntry
): Promise<string> {
  var claimedHash = entry.toObject().parentHash
  if (!claimedHash) throw new Error('entry parentHash cannot be null!')
  var {hash: previousHash} = await lastEntry(groupId)
  if (previousHash !== claimedHash) {
    throw new ValidationError(`claimed hash: ${claimedHash}, reality: ${previousHash}`)
  }
  const hash = entry.toHash()
  Log.tableName = groupId // just in case the call to `transaction` needs it...
  await transaction(HashToData, Log, async function (HashToData, Log) {
    await HashToData.query().insert({hash, value: entry.toJSON()})
    await Log.table(groupId).insert({...entry.toObject(), hash})
  })
  console.log('appendLogEntry():', entry, hash)
  return hash
}

export async function lastEntry (groupId: string) {
  // `findById` is broken, creates a query referencing the wrong table, so we use `where`
  var entries = await Log.table(groupId).where('id', Log.table(groupId).max('id'))
  return entries[0]
}

// TODO: does this stream need to be consumed? what happens if it isn't?
//       do we need to close it anyway after some time or something?
// "On an HTTP server, make sure to manually close your streams if a request is aborted."
// From: http://knexjs.org/#Interfaces-Streams
// https://github.com/tgriesser/knex/wiki/Manually-Closing-Streams
// => request.on('close', stream.end.bind(stream))
export function streamEntriesSince (groupId: string, hash: string) {
  return Log.table(groupId).where(
    'id', '>', Log.table(groupId).select('id').where('hash', hash)
  ).stream()
}

// =======================
// wrapper methods to add / lookup names
// =======================

export function registerName (name: string, value: string) {
  return Namespace.query().insert({name, value})
}

export async function lookupName (name: string) {
  var values = await Namespace.query().select('value').where('name', name)
  return values && values[0]
}

// =======================
// utility functions
// =======================

export async function stop () {
  await knex.destroy()
}

// =======================
// Test with: DEBUG=knex:* babel-node backend/database.js
// =======================

const testDatabaseJs = process.env._

if (testDatabaseJs && testDatabaseJs.indexOf('babel-node') !== -1) {
  (async function () {
    try {
      await loaded
      var entry = new Group({hello: 'world!', pubkey: 'foobarbaz'})
      var groupId = entry.toHash()
      console.log('creating group:', groupId)
      await createLog(groupId, entry)

      entry = new Group({crazy: 'lady'}, groupId)
      var res = await appendLogEntry(groupId, entry)
      console.log(`added log entry ${entry.toJSON()} with result:`, res)
      res = await lastEntry(groupId)
      console.log(`last log entry for ${Log.tableName}:`, res)

      knex.destroy()
      process.exit(0)
    } catch (err) {
      console.log('exception:', err.message, err.stack)
      knex.destroy()
      process.exit(1)
    }
  })()
}
