'use strict'

import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import Sqlite3 from 'better-sqlite3'

let db: any = null
let readStatement: any = null
let writeStatement: any = null
let deleteStatement: any = null

const run = (sql) => {
  db.exec(sql)
}

export async function initStorage (options: Object = {}): Promise<void> {
  const { dirname, filename } = options
  const dataFolder = resolve(dirname)

  await mkdir(dataFolder, { mode: 0o750, recursive: true })

  if (db) {
    throw new Error(`The ${filename} SQLite database is already open.`)
  }
  db = new Sqlite3(join(dataFolder, filename))
  run('CREATE TABLE IF NOT EXISTS Data(key TEXT NOT NULL PRIMARY KEY, value TEXT NOT NULL)')
  console.info(`Connected to the ${filename} SQLite database.`)
  readStatement = db.prepare('SELECT value FROM Data WHERE key = ?')
  writeStatement = db.prepare('REPLACE INTO Data(key, value) VALUES(?, ?)')
  deleteStatement = db.prepare('DELETE FROM Data WHERE key = ?')
}

// Useful in test hooks.
// eslint-disable-next-line require-await
export async function clear (): Promise<void> {
  return run('DELETE FROM Data')
}

// eslint-disable-next-line require-await
export async function readData (key: string): Promise<Buffer | string | void> {
  const result = readStatement.get(key)
  return result?.value
}

// eslint-disable-next-line require-await
export async function writeData (key: string, value: Buffer | string): Promise<void> {
  writeStatement.run(key, value)
}

// eslint-disable-next-line require-await
export async function deleteData (key: string): Promise<void> {
  deleteStatement.run(key)
}
