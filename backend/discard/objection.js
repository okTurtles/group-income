// This file shows the previous database schema format, where all group
// logs were stored in a single table instead of having a single table
// for each group.
import Knex from 'knex'
import {Model, transaction} from 'objection'
import multihash from 'multihashes'

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
      var buff = multihash.encode(Buffer.from(this.value), 'sha2-256')
      this.hash = multihash.toB58String(buff)
    }
  }
}

// See also https://vincit.github.io/objection.js/#virtualattributes
export class Log extends Model {
  static tableName = 'Log'
  static jsonSchema = {
    type: 'object',
    required: ['groupId', 'entryNum', 'entry'],
    properties: {
      id: {type: 'integer'},
      groupId: {type: 'string'},
      entryNum: {type: 'integer'},
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
  $beforeInsert (context) {
    this.created_at = new Date().toISOString()
  }
}

export class Group extends Model {
  static tableName = 'Group'
  static jsonSchema = {
    type: 'object',
    properties: {
      id: {type: 'string'},
      lastEntryNum: {type: 'integer'}
    }
  }
  // note that this isn't needed. we can instead use a single query as shown
  // below (the very last query that's executed in the test code).
  static relationMappings = {
    lastEntry: {
      relation: Model.HasOneRelation,
      modelClass: Log,
      join: {
        from: ['Group.id', 'Group.lastEntryNum'],
        to: ['Log.groupId', 'Log.entryNum']
      }
    }
  }
}

// =======================
// wrapper methods to add log entries / create groups
// =======================

export default {
  async createGroup (entry) {
    var groupId
    var res = await transaction(HashToData, Group, Log, async function (HashToData, Group, Log) {
      var content = await HashToData.query().insert({value: JSON.stringify(entry)})
      console.log('inserted:', content)
      groupId = content.hash
      await Log.query().insert({groupId, entry, entryNum: 0})
      await Group.query().insert({id: groupId, lastEntryNum: 0})
    })
    // TODO: get rid of this debugging or convert it to events using Good
    console.log('transaction completed with result:', res)
    return Promise.resolve(groupId)
  },

  async appendLogEntry (groupId, entry) {
    var res = await transaction(Group, Log, async function (Group, Log) {
      var group = await Group.query().updateAndFetchById(groupId, {
        lastEntryNum: Group.raw('lastEntryNum + 1')
      })
      var log = await Log.query().insert({groupId, entry, entryNum: group.lastEntryNum})
      console.log('last log:', log)
    })
    console.log('transaction completed with result:', res) // TODO: same as above
    return Promise.resolve(res)
  },

  async fetchEntriesSince (groupId, timestamp) {
    // TODO: this
  },
  // Create tables and return a promise that the importing file can wait on
  loaded: knex.schema
    .createTableIfNotExists('HashToData', function (table) {
      table.increments()
      table.text('hash').notNullable()
      table.text('value').notNullable()
    }).createTableIfNotExists('Group', function (table) {
      table.text('id').primary()
      table.integer('lastEntryNum').unsigned()
    }).createTableIfNotExists('Log', function (table) {
      table.increments()
      table.text('groupId').references('id').inTable('Group')
      table.integer('entryNum').unsigned().notNullable()
      table.text('entry').notNullable()
      table.dateTime('created_at').notNullable()
      table.unique(['groupId', 'entryNum'])
    })
}

// =======================
// Test
// =======================


const testDatabaseJs = false

if (testDatabaseJs) {
  (async function () {
    await db.loaded
    var entry = {
      version: '0',
      parentHash: null,
      data: {
        hello: 'world!',
        pubkey: 'foobarbaz'
      }
    }
    var content = await HashToData.query().insert({value: JSON.stringify(entry)})
    console.log('inserted:', content)
    var groupId = content.hash

    var res = await transaction(Group, Log, async function (Group, Log) {
      await Log.query().insert({groupId, entry, entryNum: 0})
      await Group.query().insert({id: groupId, lastEntryNum: 0})
    })
    console.log('transaction completed with result:', res)

    entry.parentHash = groupId
    entry.data = {its: 'a new world'}

    res = await transaction(Group, Log, async function (Group, Log) {
      var group = await Group.query().updateAndFetchById(groupId, {
        lastEntryNum: Group.raw('lastEntryNum + 1')
      })
      var log = await Log.query().insert({groupId, entry, entryNum: group.lastEntryNum})
      console.log('last log:', log)
    })
    console.log('transaction completed with result:', res)

    // and now to fetch the latest transaction
    res = await Group.query().first().where('id', groupId)
    console.log('got group:', res)
    res = await res.$relatedQuery('lastEntry').first()
    console.log('last log again:', res)
    console.log('last log data:', res.entry.data)
    // another way, using one query, and without relations.
    res = await Log.query().first().where('groupId', groupId).andWhere('entryNum', 'in', Group.query().select('lastEntryNum').where('id', groupId))
    console.log('last log again:', res)

    knex.destroy()
    process.exit(0)
  })()
}
