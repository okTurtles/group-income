'use strict'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { checkKey } from './database.js'

let dataFolder = './data'

export async function initStorage (options: Object = {}): Promise<void> {
  dataFolder = path.resolve(options.dirname)
  await mkdir(dataFolder, { mode: 0o750, recursive: true })
}

// eslint-disable-next-line require-await
export async function readString (key: string): Promise<string | void> {
  checkKey(key)
  return readFile(`${dataFolder}/${key}`)
    .then(buffer => buffer.toString('utf8'))
    .catch(err => undefined) // eslint-disable-line node/handle-callback-err
}

// eslint-disable-next-line require-await
export async function writeString (key: string, value: string): Promise<void> {
  checkKey(key)
  return writeFile(`${dataFolder}/${key}`, value)
}
