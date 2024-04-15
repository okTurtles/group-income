'use strict'

import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { checkKey } from '~/shared/domains/chelonia/db.js'

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

// eslint-disable-next-line require-await
export async function readData (key: string): Promise<Buffer | string | void> {
  // Necessary here to thwart path traversal attacks.
  checkKey(key)
  return readFile(join(dataFolder, key))
    .catch(err => undefined) // eslint-disable-line node/handle-callback-err
}

// eslint-disable-next-line require-await
export async function writeData (key: string, value: Buffer | string): Promise<void> {
  return writeFile(join(dataFolder, key), value)
}

// eslint-disable-next-line require-await
export async function deleteData (key: string): Promise<void> {
  return unlink(join(dataFolder, key)).catch(e => {
    // Ignore 'not found' errors
    if (e?.code === 'ENOENT') {
      return
    }
    throw e
  })
}
