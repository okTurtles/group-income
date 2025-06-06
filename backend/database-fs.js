'use strict'

import { mkdir, readdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, join, normalize, resolve } from 'node:path'
import { checkKey } from 'libchelonia/db'
import DatabaseBackend from './DatabaseBackend.js'
import type { IDatabaseBackend } from './DatabaseBackend.js'

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
      const errStr = 'Filesystem database backend only works on case-sensitive filesystems. This appears to be a case insensitive file system. Set SKIP_DB_FS_CASE_SENSITIVITY_CHECK=true to skip.'
      console.error(errStr)
      throw new Error(errStr)
    }
  } finally {
    await deleteData(originalKey)
  }
}

const splitAndGroup = (input: string, chunkLength: number, depth: number) => input.slice(0, chunkLength * depth).split('').reduce((acc, cv, i) => {
  acc[i / chunkLength | 0] = (acc[i / chunkLength | 0] || '') + cv
  return acc
}, [])

export default class FsBackend extends DatabaseBackend implements IDatabaseBackend {
  dataFolder: string = ''
  depth: number = 0
  keyChunkLength: number = 2

  constructor (options: Object = {}) {
    super()
    this.dataFolder = resolve(options.dirname)
    if (options.depth) this.depth = options.depth
    if (options.keyChunkLength) this.keyChunkLength = options.keyChunkLength
  }

  // Maps a given key to a real path on the filesystem.
  mapKey (key: string): string {
    // The following `basepath(normalize())` check is an attempt at preventing
    // path traversal and similar issues, accidental or intentional, by ensuring
    // that the `key` corresponds to a file name. This is a defense-in-depth
    // check, since `checkKey` in `chelonia/db.js` already disallows path
    // separators. This check is platform-specific, so, for example, this check
    // will succeed on Linux or macOS for `\\?\C:\Windows\System32\kernel32.dll`
    // but it will fail on Windows for the same path.
    if (basename(normalize(key)) !== key) throw new TypeError('Invalid key')
    if (!this.depth) return join(this.dataFolder, key)
    const keyChunks = splitAndGroup(key, this.keyChunkLength, this.depth)
    return join(this.dataFolder, ...keyChunks, key)
  }

  async init () {
    await mkdir(this.dataFolder, { mode: 0o750, recursive: true })
    if (process.env.SKIP_DB_FS_CASE_SENSITIVITY_CHECK === undefined) {
      await testCaseSensitivity(this)
    }
  }

  async clear () {
    const names = await readdir(this.dataFolder)
    const paths = names.map(name => join(this.dataFolder, name))
    await Promise.all(paths.map(p => rm(p, { recursive: true }))
    )
  }

  async readData (key: string): Promise<Buffer | string | void> {
    // Necessary here to thwart path traversal attacks.
    checkKey(key)
    return await readFile(this.mapKey(key))
      .catch(err => {
        // If the key was not found (ENOENT), ignore the error since in that case we want to return undefined.
        if (err.code !== 'ENOENT') throw err
      })
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
