import * as pathlib from 'path'

import sbp from "@sbp/sbp"
import { notFound } from 'pogo/lib/bang.ts'

import '~/shared/domains/chelonia/db.ts'
import { strToB64 } from '~/shared/functions.ts'

const CI = Deno.env.get('CI')
const GI_VERSION = Deno.env.get('GI_VERSION')
const NODE_ENV = Deno.env.get('NODE_ENV')

const { AlreadyExists, BadRequest, NotFound } = Deno.errors
const dataFolder = pathlib.resolve('./data')
const production = NODE_ENV === 'production'
const readFileAsync = Deno.readFile
const readTextFileAsync = Deno.readTextFile
const writeFileAsync = Deno.writeFile
const writeTextFileAsync = Deno.writeTextFile

const dirExists = async (pathname: numer) => {
  try {
    const stats = await Deno.stat(pathname)
    return stats ?? stats.isDirectory()
  } catch {
    return false
  }
}

const fileExists = async (pathname) => {
  try {
    const stats = await Deno.stat(pathname)
    return stats ?? stats.isFile()
  } catch {
    return false
  }
}

if (!(await dirExists(dataFolder))) {
  await Deno.mkdir(dataFolder, { mode: 0o750, recursive: true })
}

export default (sbp('sbp/selectors/register', {
  'backend/db/streamEntriesSince': async function (contractID: string, hash: string) {
    let currentHEAD = await sbp('chelonia/db/latestHash', contractID)
    if (!currentHEAD) {
      throw notFound(`contractID ${contractID} doesn't exist!`)
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
  'backend/db/streamEntriesBefore': async function (before: string, limit: number): Promise<any> {
    let currentHEAD = before
    let entry = await sbp('chelonia/db/getEntry', currentHEAD)
    if (!entry) {
      throw notFound(`entry ${currentHEAD} doesn't exist!`)
    }
    limit++ // to return `before` apart from the `limit` number of events
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
  'backend/db/streamEntriesBetween': async function (startHash: string, endHash: string, offset: number): Promise<any> {
    let isMet = false
    let currentHEAD = endHash
    let entry = await sbp('chelonia/db/getEntry', currentHEAD)
    if (!entry) {
      throw notFound(`entry ${currentHEAD} doesn't exist!`)
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
  // wrapper methods to add / lookup names
  // =======================
  'backend/db/registerName': async function (name: string, value: string) {
    const lookup = await sbp('backend/db/lookupName', name) || null
    if (lookup) {
      if (!(lookup instanceof Error)) {
        return new AlreadyExists(`in backend/db/registerName: ${name}`)
      }
      if (!(lookup instanceof NotFound)) {
        // Throw if this is an error other than "not found".
        throw lookup
      }
      // Otherwise it is a Boom.notFound(), proceed ahead.
    }
    await sbp('chelonia/db/set', namespaceKey(name), value)
    return { name, value }
  },
  'backend/db/lookupName': async function (name: string) {
    const value = await sbp('chelonia/db/get', namespaceKey(name))
    return value || new NotFound(name)
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
}))

function namespaceKey (name: string): string {
  return 'name=' + name
}

function throwIfFileOutsideDataDir (filename: string): string {
  const filepath = pathlib.resolve(pathlib.join(dataFolder, filename))
  if (!filepath.startsWith(dataFolder)) {
    throw new BadRequest(`bad name: ${filename}`)
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
