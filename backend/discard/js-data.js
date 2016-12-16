// this is from when I was considered replacing using Objection.js with js-data
// but decided that it would be better to just use objection.js for SQL things
// and purpose-suited RethinkDB libraries for RethinkDB (if we ever decide to
// use it).
import {Container} from 'js-data'
import {SqlAdapter} from 'js-data-sql'
import multihash from 'multihashes'

// Initialize knex connection.
const adapter = new SqlAdapter({
  knexOpts: {
    client: 'sqlite3',
    connection: {
      filename: process.env.NODE_ENV === 'production' ? 'groupincome.db' : ':memory:'
    },
    useNullAsDefault: true
  },
  beforeCreate (resource, data, opts) {
    // console.log('!! Adapter.beforeCreate resource: ', resource, ' !! data: ', data, '\n!! opts:', opts, ' !! cb:', cb)
    for (var key in data) {
      if (typeof data[key] === 'object') {
        data[key] = JSON.stringify(data[key])
      }
    }
    if (db[resource.name] && db[resource.name].beforeCreate) {
      db[resource.name].beforeCreate(data, opts)
    }
  }
})
const store = new Container()

store.registerAdapter('sql', adapter, { default: true })

// =======================
// Define tables and models
// =======================

export var db = {
  adapter,
  store,
  loaded: adapter.knex.schema
    .createTableIfNotExists('IPFS', function (table) {
      table.increments()
      table.text('hash').notNullable()
      table.text('value').notNullable()
    }).createTableIfNotExists('Groups', function (table) {
      table.text('id').primary()
      table.integer('lastEntryNum').unsigned()
    }).createTableIfNotExists('Logs', function (table) {
      table.increments()
      table.text('groupId').references('id').inTable('Group')
      table.integer('entryNum').unsigned().notNullable()
      table.text('entry').notNullable()
      table.dateTime('created_at').notNullable()
      table.unique(['groupId', 'entryNum'])
    })
}

// http://api.js-data.io/js-data/3.0.0-rc.2/Container.html
// NOTE: if we use 'js-data-http' in the client with js-data, then the schemas
//       here could be shared between client and server as shown here:
//       http://www.js-data.io/v3.0/docs/modeling-your-data
db.IPFS = store.defineMapper('IPFS', {
  table: 'IPFS',
  schema: {
    type: 'object',
    required: ['value'],
    properties: {
      id: {type: 'integer'},
      hash: {type: 'string', indexed: true},
      value: {type: 'string'}
    }
  },
  beforeCreate (props, opts) {
    console.log('!! IPFS.beforeCreate props: ', props, ' !! opts: ', opts)
    if (!props.hash) {
      // use multihash.Buffer in the browser
      var buff = multihash.encode(Buffer.from(props.value), 'sha2-256')
      props.hash = multihash.toB58String(buff)
    }
  }
})
db.Log = store.defineMapper('Log', {
  table: 'Logs',
  schema: {
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
  },
  beforeCreate (props, opts) {
    // console.log('!! Log.beforeCreate props: ', props, ' !! opts: ', opts)
    props.created_at = new Date().toISOString()
  }
})
db.Group = store.defineMapper('Group', {
  table: 'Groups',
  schema: {
    type: 'object',
    properties: {
      id: {type: 'string'},
      lastEntryNum: {type: 'integer'}
    }
  }
  /* static relationMappings = {
    lastEntry: {
      relation: Model.HasOneRelation,
      modelClass: Log,
      join: {
        from: ['Group.id', 'Group.lastEntryNum'],
        to: ['Log.groupId', 'Log.entryNum']
      }
    }
  } */
})

// Test

const testDatabaseJs = true

if (testDatabaseJs) {
  (async function () {
    await db.loaded
    var entry = {
      version: '0',
      parentHash: null,
      data: {
        hello: "world's!",
        pubkey: 'foobarbaz'
      }
    }
    var {IPFS, Group, Log} = db
    var content = await IPFS.create({value: JSON.stringify(entry)})
    console.log('inserted:', content.toJSON())
    var groupId = content.hash

    // transactions have to be accessed through the adapter
    var res = await adapter.knex.transaction(async function (txn) {
      await adapter.create(Log, {groupId, entry: content.value, entryNum: 0}, {transaction: txn})
      await adapter.create(Group, {id: groupId, lastEntryNum: 0}, {transaction: txn})
    })
    console.log('transaction completed with result:', res)

    entry.parentHash = groupId
    entry.data = {its: 'a new world'}

    res = await adapter.knex.transaction(async function (txn) {
      var group = await adapter.update(Group, groupId, {
        lastEntryNum: adapter.knex.raw('lastEntryNum + 1')
      }, {transaction: txn})
      console.log('group.lastEntryNum:', group.lastEntryNum)
      var log = await adapter.create(Log, {groupId, entry, entryNum: group.lastEntryNum}, {transaction: txn})
      console.log('last log:', log)
    })
    console.log('transaction completed with result:', res)
/*
    // and now to fetch the latest transaction
    res = await Group.query().first().where('id', groupId)
    console.log('got group:', res)
    res = await res.$relatedQuery('lastEntry').first()
    console.log('last log again:', res)
    console.log('last log data:', res.entry.data)
*/
    // another way, using one query.
    // TODO: this doesn't work
    res = await Log.findAll([{groupId}, {entryNum: {'in': adapter.knex.select('lastEntryNum').from('Groups').where('id', groupId)}}])
    console.log('last log again:', res)
    process.exit(0)
  })()
}
