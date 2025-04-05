'use strict'

import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import sqlite3 from 'sqlite3'
import DatabaseBackend from './DatabaseBackend'

export default class SqliteBackend extends DatabaseBackend {
  dataFolder: string = ''
  db: any = null
  filename: string = ''
  readStatement: Object = null
  writeStatement: Object = null
  deleteStatement: Object = null

  constructor (options: Object = {}) {
    super()
    const { dirname, filename } = options
    this.dataFolder = resolve(dirname)
    this.filename = filename
  }

  async run (sql: string) {
    await new Promise((resolve, reject) => {
      this.db.run(sql, undefined, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  async init () {
    const { dataFolder, filename } = this

    await mkdir(dataFolder, { mode: 0o750, recursive: true })

    await new Promise((resolve, reject) => {
      if (this.db) {
        reject(new Error(`The ${filename} SQLite database is already open.`))
      }
      this.db = new sqlite3.Database(join(dataFolder, filename), (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
    await this.run('CREATE TABLE IF NOT EXISTS Data(key TEXT NOT NULL PRIMARY KEY, value TEXT NOT NULL)')
    console.info(`Connected to the ${filename} SQLite database.`)
    this.readStatement = this.db.prepare('SELECT value FROM Data WHERE key = ?')
    this.writeStatement = this.db.prepare('REPLACE INTO Data(key, value) VALUES(?, ?)')
    this.deleteStatement = this.db.prepare('DELETE FROM Data WHERE key = ?')
  }

  // Useful in test hooks.
  async clear () {
    await this.run('DELETE FROM Data')
  }

  async readData (key: string): Promise<Buffer | string | void> {
    return await new Promise((resolve, reject) => {
      this.readStatement.get([key], (err, row) => {
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

  async writeData (key: string, value: Buffer | string) {
    await new Promise((resolve, reject) => {
      this.writeStatement.run([key, value], (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  async deleteData (key: string) {
    await new Promise((resolve, reject) => {
      this.deleteStatement.run([key], (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}
