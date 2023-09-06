'use strict'

import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import sqlite3 from 'sqlite3'

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

export function readData (key: string): Promise<Buffer | string | void> {
  return new Promise((resolve, reject) => {
    readStatement.get([key], (err, row) => {
      if (err) {
        reject(err)
      } else {
        // Note: sqlite remembers the type of every stored value, therefore we
        // automatically get back the same JS value that has been inserted.
        resolve(row?.value)
      }
    })
  })
}

export function writeData (key: string, value: Buffer | string): Promise<void> {
  return new Promise((resolve, reject) => {
    writeStatement.run([key, value], (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
