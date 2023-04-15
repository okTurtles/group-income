'use strict'

import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import sqlite3 from 'sqlite3'

import { checkKey } from './database.js'

let db: any = null
let readStatement: any = null
let writeStatement: any = null

const run = (sql, args) => {
  return new Promise((resolve, reject) => {
    db.run(sql, args, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

export async function initStorage (options: Object = {}): Promise<void> {
  const { dirname, filename } = options
  const dataFolder = resolve(dirname)

  await mkdir(dataFolder, { mode: 0o750, recursive: true })

  await new Promise((resolve, reject) => {
    if (db) {
      reject(new Error(`The ${filename} SQLite database is already open.`))
    }
    db = new sqlite3.Database(join(dataFolder, filename), (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
  await run('CREATE TABLE IF NOT EXISTS Data(key TEXT NOT NULL PRIMARY KEY, value TEXT NOT NULL)')
  console.log('Connected to the %s SQLite database.', filename)
  readStatement = db.prepare('SELECT value FROM Data WHERE key = ?')
  writeStatement = db.prepare('REPLACE INTO Data(key, value) VALUES(?, ?)')
}

// Useful in test hooks.
export function clear (): Promise<void> {
  return run('DELETE FROM Data')
}

export function exportToJSON (): Promise<Object> {
  return new Promise((resolve, reject) => {
    db.all('SELECT key, value FROM Data', [], (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(Object.fromEntries(rows.map(row => ([row.key, row.value]))))
      }
    })
  })
}

export function importFromJSON (json: Object): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN')
      Object.keys(json).forEach(key => writeData(key, json[key]))
      db.run('COMMIT', [], (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  })
}

export function readData (key: string): Promise<Buffer | string | void> {
  return new Promise((resolve, reject) => {
    checkKey(key)
    readStatement.get([key], (err, row) => {
      if (err) {
        reject(err)
      } else {
        resolve(row?.value)
      }
    })
  })
}

export function writeData (key: string, value: Buffer | string): Promise<void> {
  return new Promise((resolve, reject) => {
    checkKey(key)
    writeStatement.run([key, value], (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
