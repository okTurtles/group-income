'use strict'

import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import sqlite3 from 'sqlite3'

import { checkKey } from './database.js'

let db: any = null
let readStatement: any = null
let writeStatement: any = null

export async function initStorage (options: Object = {}): Promise<void> {
  const { dirname, filename } = options
  const dataFolder = resolve(dirname)

  await mkdir(dataFolder, { mode: 0o750, recursive: true })

  await new Promise((resolve, reject) => {
    if (db) {
      reject(new Error(`The ${filename} SQLite database is already open.`))
    }
    db = new sqlite3.Database(`${dataFolder}/${filename}`, (err) => {
      if (err) {
        reject(err)
      }
    })
    db.run('CREATE TABLE IF NOT EXISTS Strings(key TEXT UNIQUE NOT NULL, value TEXT NOT NULL)', [], (err) => {
      if (err) {
        reject(err)
      } else {
        console.log('Connected to the %s SQLite database.', filename)
        resolve()
      }
    })
  })
  readStatement = db.prepare('SELECT value FROM Strings WHERE key = ?')
  writeStatement = db.prepare('REPLACE INTO Strings(key, value) VALUES(?, ?)')
}

export function readString (key: string): Promise<string | void> {
  return new Promise((resolve, reject) => {
    checkKey(key)
    readStatement.run([key], (err, row) => {
      if (err) {
        reject(err)
      } else {
        resolve(row?.value)
      }
    })
  })
}

export function writeString (key: string, value: string): Promise<void> {
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
