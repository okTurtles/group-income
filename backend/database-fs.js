'use strict'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { checkKey } from './database.js'

// Initialized in `initStorage()`.
let dataFolder = ''

export async function initStorage (options: Object = {}): Promise<void> {
  dataFolder = resolve(options.dirname)
  await mkdir(dataFolder, { mode: 0o750, recursive: true })
}

// eslint-disable-next-line require-await
export async function readData (key: string): Promise<Buffer | void> {
  checkKey(key)
  return readFile(join(dataFolder, key))
    .then(buffer => key.startsWith('blob:') ? buffer : buffer.toString('utf8'))
    .catch(err => undefined) // eslint-disable-line node/handle-callback-err
}

// eslint-disable-next-line require-await
export async function writeData (key: string, value: Buffer | string): Promise<void> {
  checkKey(key)
  return writeFile(join(dataFolder, key), value)
}
