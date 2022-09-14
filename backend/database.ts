/* globals Deno */
import * as pathlib from 'path'

import sbp from '@sbp/sbp'

import '~/shared/domains/chelonia/db.ts'
import { strToB64 } from '~/shared/functions.ts'

const NODE_ENV = Deno.env.get('NODE_ENV')

// Don't use errors from any server framework in this file.
const { AlreadyExists, NotFound, PermissionDenied } = Deno.errors
const dataFolder = pathlib.resolve('./data')
const production = NODE_ENV === 'production'
const readFileAsync = Deno.readFile
const writeFileAsync = Deno.writeFile

const dirExists = async (pathname: string): Promise<boolean> => {
  try {
    return (await Deno.stat(pathname)).isDirectory
  } catch {
    return false
  }
}

const fileExists = async (pathname: string): Promise<boolean> => {
  try {
    return (await Deno.stat(pathname)).isFile
  } catch {
    return false
  }
}

if (!(await dirExists(dataFolder))) {
  await Deno.mkdir(dataFolder, { mode: 0o750, recursive: true })
}

// These selectors must not return bang errors.
export default sbp('sbp/selectors/register', {
  'backend/db/streamEntriesSince': async function (contractID: string, hash: string): Promise<string> {
    let currentHEAD = await sbp('chelonia/db/latestHash', contractID)
    if (!currentHEAD) {
      throw new NotFound(`contractID ${contractID} doesn't exist!`)
    }
    const chunks = ['[']
    try {
      while (true) {
        const entry = await sbp('chelonia/db/getEntry', currentHEAD)
        if (!entry) {
          console.error(`read(): entry ${currentHEAD} no longer exists.`)
          chunks.push(']')
          break
        }
        if (chunks.length > 1) chunks.push(',')
        chunks.push(`"${strToB64(entry.serialize())}"`)
        if (currentHEAD === hash) {
          chunks.push(']')
          break
        } else {
         currentHEAD = entry.message().previousHEAD
        }
      }
    } catch (error) {
      console.error(`read(): ${error.message}:`, error)
    }
    return chunks.join('')
  },
  'backend/db/streamEntriesBefore': async function (before: string, limit: number): Promise<string> {
    let currentHEAD = before
    let entry = await sbp('chelonia/db/getEntry', currentHEAD)
    if (!entry) {
      throw new NotFound(`entry ${currentHEAD} doesn't exist!`)
    }
    // To return `before` apart from the `limit` number of events.
    limit++
    const chunks = ['[']
    try {
      while (true) {
        if (!currentHEAD || !limit) {
          chunks.push(']')
          break
        }
        const entry = await sbp('chelonia/db/getEntry', currentHEAD)
        if (!entry) {
          console.error(`read(): entry ${currentHEAD} no longer exists.`)
          chunks.push(']')
          break
        }
        if (chunks.length > 1) chunks.push(',')
        chunks.push(`"${strToB64(entry.serialize())}"`)

        currentHEAD = entry.message().previousHEAD
        limit--
      }
    } catch (error) {
      console.error(`read(): ${error.message}:`, error)
    }
    return chunks.join('')
  },
  'backend/db/streamEntriesBetween': async function (startHash: string, endHash: string, offset: number): Promise<string> {
    let isMet = false
    let currentHEAD = endHash
    let entry = await sbp('chelonia/db/getEntry', currentHEAD)
    if (!entry) {
      throw new NotFound(`entry ${currentHEAD} doesn't exist!`)
    }
    const chunks = ['[']
    try {
      while (true) {
        const entry = await sbp('chelonia/db/getEntry', currentHEAD)
        if (!entry) {
          console.error(`read(): entry ${currentHEAD} no longer exists.`)
          chunks.push(']')
          break
        }
        if (chunks.length > 1) chunks.push(',')
        chunks.push(`"${strToB64(entry.serialize())}"`)

        if (currentHEAD === startHash) {
          isMet = true
        } else if (isMet) {
          offset--
        }
        currentHEAD = entry.message().previousHEAD

        if (!currentHEAD || (isMet && !offset)) {
          chunks.push(']')
          break
        }
      }
    } catch (error) {
      console.error(`read(): ${error.message}:`, error)
    }
    return chunks.join('')
  },
  // =======================
  // Wrapper methods to add / lookup names
  // =======================
  'backend/db/registerName': async function (name: string, value: string): Promise<{ name: string, value: string } | Error> {
    try {
      await sbp('backend/db/lookupName', name)
      // If no error was thrown, then the given name has already been registered.
      return new AlreadyExists(`in backend/db/registerName: ${name}`)
    } catch (err) {
      // Proceed ahead if this is a NotFound error.
      if (err instanceof NotFound) {
        await sbp('chelonia/db/set', namespaceKey(name), value)
        return { name, value }
      }
      // Otherwise it is an unexpected error, so rethrow it.
      throw err
    }
  },
  'backend/db/lookupName': async function (name: string) {
    const value = await sbp('chelonia/db/get', namespaceKey(name))
    console.log('value:', value)
    if (value !== undefined) {
      return value
    } else {
      throw new NotFound(name)
    }
  },
  // =======================
  // Filesystem API
  //
  // TODO: add encryption
  // =======================
  'backend/db/readFile': async function (filename: string) {
    const filepath = throwIfFileOutsideDataDir(filename)
    if (!(await fileExists(filepath))) {
      return new NotFound()
    }
    return await readFileAsync(filepath)
  },
  'backend/db/writeFile': async function (filename: string, data: any) {
    // TODO: check for how much space we have, and have a server setting
    //       that determines how much of the disk space we're allowed to
    //       use. If the size of the file would cause us to exceed this
    //       amount, throw an exception
    return await writeFileAsync(throwIfFileOutsideDataDir(filename), data)
  },
  'backend/db/writeFileOnce': async function (filename: string, data: any) {
    const filepath = throwIfFileOutsideDataDir(filename)
    if (await fileExists(filepath)) {
      console.warn('writeFileOnce: exists:', filepath)
      return
    }
    return await writeFileAsync(filepath, data)
  }
})

function namespaceKey (name: string): string {
  return 'name=' + name
}

// TODO: maybe Deno's own filesystem permissions can make this unnecessary.
function throwIfFileOutsideDataDir (filename: string): string {
  const filepath = pathlib.resolve(pathlib.join(dataFolder, filename))
  if (!filepath.startsWith(dataFolder)) {
    throw new PermissionDenied(`bad name: ${filename}`)
  }
  return filepath
}

if (production || Deno.env.get('GI_PERSIST')) {
  sbp('sbp/selectors/overwrite', {
    // we cannot simply map this to readFile, because 'chelonia/db/getEntry'
    // calls this and expects a string, not a Buffer
    // 'chelonia/db/get': sbp('sbp/selectors/fn', 'backend/db/readFile'),
    'chelonia/db/get': async function (filename: string) {
      const value = await sbp('backend/db/readFile', filename)
      return value instanceof Error ? null : value.toString('utf8')
    },
    'chelonia/db/set': sbp('sbp/selectors/fn', 'backend/db/writeFile')
  })
  sbp('sbp/selectors/lock', ['chelonia/db/get', 'chelonia/db/set', 'chelonia/db/delete'])
}
