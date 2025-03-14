'use strict'

import { mkdir, readdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { rebindMethods } from './db-utils.js'
import { checkKey } from '~/shared/domains/chelonia/db.js'

// Some operating systems (such as macOS and Windows) use case-insensitive
// filesystems by default. This can be problematic for Chelonia / Group Income,
// as we rely on keys being case-sensitive. This is especially relevant for CIDs,
// where collisions could lead to DoS or data corruption.
async function testCaseSensitivity (backend: Object) {
  const { readData, writeData, deleteData } = backend
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

export default class FsBackend {
  dataFolder: string = ''
  depth: number = 0

  constructor (options: Object = {}) {
    this.dataFolder = resolve(options.dirname)
    this.depth = options.depth ?? 0
    rebindMethods(this)
  }

  // Maps a given key to a real path on the filesystem.
  mapKey (key: string): string {
    if (!this.depth) return join(this.dataFolder, key)
    const keyChunks = key.match(/[A-Za-z]{1,3}/g) ?? []
    return join(this.dataFolder, ...keyChunks.slice(0, this.depth), keyChunks.slice(this.depth).join(''))
  }

  async init () {
    await mkdir(this.dataFolder, { mode: 0o750, recursive: true })
    await testCaseSensitivity(this)
  }

  async clear () {
    await Promise.all(
      await readdir(this.dataFolder)
        .then(names => names.map(name => join(this.dataFolder, name)))
        .then(paths => paths.map(path => rm(path, { recursive: true })))
    )
  }

  async readData (key: string): Promise<Buffer | string | void> {
    // Necessary here to thwart path traversal attacks.
    checkKey(key)
    return await readFile(this.mapKey(key))
      .catch(err => undefined) // eslint-disable-line node/handle-callback-err
  }

  async writeData (key: string, value: Buffer | string) {
    const path = this.mapKey(key)
    if (this.depth) await mkdir(dirname(path), { mode: 0o750, recursive: true })
    await writeFile(path, value)
  }

  async deleteData (key: string) {
    await unlink(this.mapKey(key)).catch(e => {
      // Ignore 'not found' errors
      if (e?.code === 'ENOENT') {
        return
      }
      throw e
    })
  }
}
