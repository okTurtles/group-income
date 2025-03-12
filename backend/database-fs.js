'use strict'

import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { checkKey } from '~/shared/domains/chelonia/db.js'

// Initialized in `initStorage()`.
let dataFolder = ''

// Some operating systems (such as macOS and Windows) use case-insensitive
// filesystems by default. This can be problematic for Chelonia / Group Income,
// as we rely on keys being case-sensitive. This is especially relevant for CIDs,
// where collissions could lead to DoS or data corruption.
async function testCaseSensitivity () {
  const date = new Date()
  const dateString = date.toISOString()
  const originalKey = `_private_testCaseSensitivity_${date.getTime()}_${(0, Math.random)().toFixed(8).slice(2)}`
  // We only replace the first `p` with `P`. We don't use, e.g., `.toUpperCase()`
  // because case conversion depends on the locale, and `i` may sometimes be
  // `I` and sometimes be `İ`.
  const differentlyCasedKey = '_P' + originalKey.slice(2)
  await writeData(originalKey, dateString)
  try {
    const valueOriginalCase = await readData(originalKey)
    const valueDifferentCase = await readData(differentlyCasedKey)
    if (valueOriginalCase?.toString() !== dateString) {
      console.error(`Unexpected value on case-sensitivity test; expected ${dateString}`)
      throw new Error('Unexpected value: original key does not have the correct value')
    }
    if (valueDifferentCase?.toString() === dateString) {
      console.error('Filesystem database backend only works on case-sensitive filesystems. This appears to be a case insensitive file system.')
      throw new Error('Filesystem database backend only works on case-sensitive filesystems. This appears to be a case insensitive file system.')
    }
  } finally {
    await deleteData(originalKey)
  }
}

export async function initStorage (options: Object = {}): Promise<void> {
  dataFolder = resolve(options.dirname)
  await mkdir(dataFolder, { mode: 0o750, recursive: true })
  await testCaseSensitivity()
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
