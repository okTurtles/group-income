'use strict'

import Knex from 'knex'
import {Model, transaction, ValidationError} from 'objection'
import {toHash, makeEntry} from '../shared/functions'
import {ENTRY_TYPE} from '../shared/constants'
import type {Entry} from '../shared/types'

// Initialize knex connection.
const knex = Knex({
  client: 'sqlite3',
  connection: {
    // TODO: change :memory: to test.db and drop all tables from it at launch
    filename: process.env.NODE_ENV === 'production' ? 'groupincome.db' : ':memory:'
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
  $beforeInsert () {
    var hash = toHash(this.value)
    if (this.hash !== hash) {
      throw new ValidationError(`HashToData: calculated ${hash} != given ${this.hash}!`)
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

export async function createGroup (hash: string, entry: Entry): Promise<string> {
  // TODO: add proper debugging events using Good
  if (entry.parentHash) throw new Error('parentHash must be null!')
  await HashToData.query().insert({hash, value: JSON.stringify(entry)})
  await knex.schema.createTableIfNotExists(hash, function (table) {
    table.increments()
    table.text('version').notNullable()
    table.text('type').notNullable()
    table.text('parentHash')
    table.text('data').notNullable()
    table.text('hash').notNullable().index()
  })
  await Log.table(hash).insert({...entry, hash})
  console.log('createGroup():', hash, entry)
  return hash
}

export async function appendLogEntry (
  groupId: string, hash: string, entry: Entry
): Promise<string> {
  var {parentHash: claimedHash} = entry
  if (!claimedHash) throw new Error('hash cannot be null!')
  var {hash: previousHash} = await lastEntry(groupId)
  if (previousHash !== claimedHash) {
    throw new ValidationError(`claimed hash: ${claimedHash}, reality: ${previousHash}`)
  }
  Log.tableName = groupId // just in case the call to `transaction` needs it...
  return transaction(HashToData, Log, async function (HashToData, Log) {
    await HashToData.query().insert({hash, value: JSON.stringify(entry)})
    await Log.table(groupId).insert({...entry, hash})
    console.log('appendLogEntry():', entry, hash)
    return hash
  })
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
      var entry = makeEntry(ENTRY_TYPE.CREATION, {hello: 'world!', pubkey: 'foobarbaz'}, null)
      var groupId = toHash(entry)
      console.log('creating group:', groupId)
      await createGroup(groupId, entry)

      entry.data = {crazy: 'lady'}
      entry.parentHash = groupId
      var res = await appendLogEntry(groupId, toHash(entry), entry)
      console.log(`added log entry ${JSON.stringify(entry.data)} with result:`, res)
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
