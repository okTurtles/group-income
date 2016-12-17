'use strict'

import Knex from 'knex'
import {Model, transaction, ValidationError} from 'objection'
import {toHash, makeEntry} from '../shared/functions'

// TODO: consider using https://github.com/flumedb/flumedb

import type {Entry} from '../shared/types'

// Initialize knex connection.
const knex = Knex({
  client: 'sqlite3',
  connection: {
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
  static _tableName = 'Log'
  static get tableName () { return this._tableName }
  static set tableName (name) { this._tableName = name }
  static jsonSchema = {
    type: 'object',
    required: ['version', 'parentHash', 'data', 'hash'],
    properties: {
      id: {type: 'integer'},
      version: {type: 'string'},
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
    console.log(`[Log] ${this.tableName} INSERT:`, this.toJSON())
  }
}

// =======================
// wrapper methods to add log entries / create groups
// =======================

export async function createGroup (hash: string, entry: Object) {
  // TODO: add proper debugging events using Good
  if (entry.parentHash) throw new Error('parentHash must be null!')
  await HashToData.query().insert({hash, value: JSON.stringify(entry)})
  Log.tableName = hash
  var table = Log.tableName // get chomped tableName based on hash
  await knex.schema.createTableIfNotExists(table, function (table) {
    table.increments()
    table.text('version').notNullable()
    table.text('parentHash')
    table.text('data').notNullable()
    table.text('hash').notNullable().index()
  })
  await Log.table(hash).insert({...entry, hash})
  console.log('createGroup():', table, entry)
  return hash
}

export async function appendLogEntry (
  groupId: string, hash: string, entry: Entry
) {
  var {parentHash: claimedHash} = entry
  if (!claimedHash) throw new Error('hash cannot be null!')
  var {hash: previousHash} = await lastEntry(groupId)
  if (previousHash !== claimedHash) {
    throw new ValidationError(`claimed hash: ${claimedHash}, reality: ${previousHash}`)
  }
  return transaction(HashToData, Log, async function (HashToData, Log) {
    await HashToData.query().insert({hash, value: JSON.stringify(entry)})
    await Log.table(groupId).insert({...entry, hash})
    console.log('appendLogEntry():', entry, hash)
    return hash
  })
}

export async function lastEntry (groupId: string) {
  return Log.table(groupId).findById(Log.table(groupId).max('id'))
}

// TODO: does this stream need to be consumed? what happens if it isn't?
//       do we need to close it anyway after some time or something?
export function streamEntriesSince (groupId: string, hash: string) {
  return Log.table(groupId).where(
    'id', '>', Log.table(groupId).select('id').where('hash', hash)
  ).stream()
}

// =======================
// Test with: DEBUG=knex:* babel-node backend/database.js
// =======================

const testDatabaseJs = process.env._

if (testDatabaseJs && testDatabaseJs.indexOf('babel-node') !== -1) {
  (async function () {
    try {
      await loaded
      var entry = makeEntry({hello: 'world!', pubkey: 'foobarbaz'})
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
