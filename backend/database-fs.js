'use strict'

import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { checkKey } from './database.js'

// Initialized in `initStorage()`.
let dataFolder = ''

export async function initStorage (options: Object = {}): Promise<void> {
  dataFolder = resolve(options.dirname)
  await mkdir(dataFolder, { mode: 0o750, recursive: true })
}

// Useful in test hooks.
export function clear (): Promise<void> {
  return readdir(dataFolder)
    .then(keys => Promise.all(keys.map(key => unlink(join(dataFolder, key)))))
}

export function exportToJSON (): Promise<Object> {
  return readdir(dataFolder)
    .then(keys => Promise.all(keys.map(key => readData(key).then(value => ([key, value])))))
    .then(Object.fromEntries)
}

export function importFromJSON (json: Object): Promise<void> {
  // TODO: rollback the operation if an error occurs?
  return Promise.all(Object.keys(json).map(key => writeData(key, json[key])))
    .then(() => undefined)
}

// eslint-disable-next-line require-await
export async function readData (key: string): Promise<Buffer | void> {
  checkKey(key)
  return readFile(join(dataFolder, key))
    .then(buffer => key.startsWith('blob=') ? buffer : buffer.toString('utf8'))
    .catch(err => undefined) // eslint-disable-line node/handle-callback-err
}

// eslint-disable-next-line require-await
export async function writeData (key: string, value: Buffer | string): Promise<void> {
  checkKey(key)
  return writeFile(join(dataFolder, key), value)
}
