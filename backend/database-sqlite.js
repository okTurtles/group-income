'use strict'

import { mkdir } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import DatabaseBackend from './DatabaseBackend.js'
import type { IDatabaseBackend } from './DatabaseBackend.js'

export default class SqliteBackend extends DatabaseBackend implements IDatabaseBackend {
  dataFolder: string = ''
  db: any = null
  filename: string = ''
  readStatement: Object = null
  writeStatement: Object = null
  deleteStatement: Object = null

  constructor (options: Object = {}) {
    super()
    const { filepath } = options
    const resolvedPath = resolve(filepath)
    this.dataFolder = dirname(resolvedPath)
    this.filename = basename(resolvedPath)
  }

  run (sql: string) {
    this.db.prepare(sql).run()
  }

  async init () {
    const { dataFolder, filename } = this

    await mkdir(dataFolder, { mode: 0o750, recursive: true })

    if (this.db) {
      throw new Error(`The ${filename} SQLite database is already open.`)
    }
    this.db = new DatabaseSync(join(dataFolder, filename))
    this.run('CREATE TABLE IF NOT EXISTS Data(key TEXT NOT NULL PRIMARY KEY, value TEXT NOT NULL)')
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
    const row = this.readStatement.get(key)
    // 'row' will be undefined if the key was not found.
    // Note: sqlite remembers the type of every stored value, therefore we
    // automatically get back the same JS value that has been inserted.
    return await row?.value
  }

  async writeData (key: string, value: Buffer | string) {
    // Explicit conversion to Buffer seems to be needed for Deno compatibility
    // (otherwise, the key appears to be dropped)
    await this.writeStatement.run(key, Buffer.isBuffer(value) ? value : Buffer.from(value))
  }

  async deleteData (key: string) {
    await this.deleteStatement.run(key)
  }
}
