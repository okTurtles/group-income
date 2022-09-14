/* globals Deno */

import { bold, yellow } from 'fmt/colors.ts'

import sbp from '@sbp/sbp'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.ts'
import { blake32Hash } from '~/shared/functions.ts'

import { badRequest, notFound } from 'pogo/lib/bang.ts'
import { Router } from 'pogo'
import type { RouteHandler } from 'pogo/lib/types.ts'
import type ServerRequest from 'pogo/lib/request.ts'
import Toolkit from 'pogo/lib/toolkit.ts'

import './database.ts'
import * as pathlib from 'path'

declare const logger: Function

export const router = new Router()

const route: Record<string, Function> = new Proxy({}, {
  get: function (obj: any, prop: string) {
    return function (path: string, handler: RouteHandler) {
      router.add({ path, method: prop, handler })
    }
  }
})

// RESTful API routes

// NOTE: We could get rid of this RESTful API and just rely on pubsub.js to do this
//       —BUT HTTP2 might be better than websockets and so we keep this around.
//       See related TODO in pubsub.js and the reddit discussion link.
route.POST('/event', async function (request: ServerRequest, h: Toolkit) {
  try {
    console.log('/event handler')
    const payload = await request.raw.text()

    const entry = GIMessage.deserialize(payload)
    await sbp('backend/server/handleEntry', entry)
    return entry.hash()
  } catch (err) {
    if (err.name === 'ChelErrorDBBadPreviousHEAD') {
      console.error(bold(yellow('ChelErrorDBBadPreviousHEAD')), err)
      return badRequest(err.message)
    }
    return logger(err)
  }
})

route.GET('/eventsBefore/{before}/{limit}', async function (request: ServerRequest, h: Toolkit) {
  try {
    const { before, limit } = request.params
    console.log('/eventsBefore:', before, limit)
    if (!before) return badRequest('missing before')
    if (!limit) return badRequest('missing limit')
    if (isNaN(parseInt(limit)) || parseInt(limit) <= 0) return badRequest('invalid limit')

    const json = await sbp('backend/db/streamEntriesBefore', before, parseInt(limit))
    // Make sure to close the stream in case of disconnection.
    // request.events.once('disconnect', stream.cancel.bind(stream))
    return h.response(json).type('application/json')
  } catch (err) {
    return logger(err)
  }
})

route.GET('/eventsBetween/{startHash}/{endHash}', async function (request: ServerRequest, h: Toolkit) {
  try {
    const { startHash, endHash } = request.params
    console.log('/eventsBetween:', startHash, endHash)
    const offset = parseInt(request.searchParams.get('offset') || '0')

    if (!startHash) return badRequest('missing startHash')
    if (!endHash) return badRequest('missing endHash')
    if (isNaN(offset) || offset < 0) return badRequest('invalid offset')

    const json = await sbp('backend/db/streamEntriesBetween', startHash, endHash, offset)
    // Make sure to close the stream in case of disconnection.
    // request.events.once('disconnect', stream.cancel.bind(stream))
    return h.response(json).type('application/json')
  } catch (err) {
    return logger(err)
  }
})

route.GET('/eventsSince/{contractID}/{since}', async function (request: ServerRequest, h: Toolkit) {
  try {
    const { contractID, since } = request.params
    console.log('/eventsSince:', contractID, since)
    const json = await sbp('backend/db/streamEntriesSince', contractID, since)
    // Make sure to close the stream in case of disconnection.
    // request.events.once('disconnect', stream.cancel.bind(stream))
    return h.response(json).type('application/json')
  } catch (err) {
    return logger(err)
  }
})

route.POST('/name', async function (request: ServerRequest, h: Toolkit) {
  try {
    console.debug('/name', request.body)
    const payload = await request.raw.json()

    const { name, value } = payload
    return await sbp('backend/db/registerName', name, value)
  } catch (err) {
    return logger(err)
  }
})

route.GET('/name/{name}', async function (request: ServerRequest, h: Toolkit) {
  console.debug('GET /name/{name}', request.params.name)
  try {
    return await sbp('backend/db/lookupName', request.params.name)
  } catch (err) {
    return logger(err)
  }
})

route.GET('/latestHash/{contractID}', async function (request: ServerRequest, h: Toolkit) {
  try {
    const { contractID } = request.params
    const hash = await sbp('chelonia/db/latestHash', contractID)
    console.debug(`[backend] latestHash for ${contractID}: `, hash)
    request.response.header('cache-control', 'no-store')
    if (!hash) {
      console.warn(`[backend] latestHash not found for ${contractID}`)
      return notFound()
    }
    return hash
  } catch (err) {
    return logger(err)
  }
})

route.GET('/time', function (request: ServerRequest, h: Toolkit) {
  request.response.header('cache-control', 'no-store')
  return new Date().toISOString()
})

// file upload related

// TODO: if the browser deletes our cache then not everyone
//       has a complete copy of the data and can act as a
//       new coordinating server... I don't like that.

route.POST('/file', async function (request: ServerRequest, h: Toolkit) {
  try {
    console.log('FILE UPLOAD!')

    const formData = await request.raw.formData()
    const data = formData.get('data') as File
    const hash = formData.get('hash')
    if (!data) return badRequest('missing data')
    if (!hash) return badRequest('missing hash')

    const fileData: ArrayBuffer = await new Promise((resolve, reject) => {
      const fileReader = new FileReader()
      fileReader.onload = (event) => {
        resolve(fileReader.result as ArrayBuffer)
      }
      fileReader.onerror = (event) => {
        reject(fileReader.error)
      }
      fileReader.readAsArrayBuffer(data)
    })
    const ourHash = blake32Hash(new Uint8Array(fileData))
    if (ourHash !== hash) {
      console.error(`hash(${hash}) != ourHash(${ourHash})`)
      return badRequest('bad hash!')
    }
    await sbp('backend/db/writeFileOnce', hash, fileData)
    console.log('/file/' + hash)
    return '/file/' + hash
  } catch (err) {
    return logger(err)
  }
})

route.GET('/file/{hash}', async function handler (request: ServerRequest, h: Toolkit) {
  try {
    const { hash } = request.params
    const base = pathlib.resolve('data')
    console.debug(`GET /file/${hash}`)
    console.debug(base)
    // Reusing the given `hash` parameter to set the ETag should be faster than
    // letting Hapi hash the file to compute an ETag itself.
    return (await h.file(pathlib.join(base, hash)))
      .header('content-type', 'application/octet-stream')
      .header('cache-control', 'public,max-age=31536000,immutable')
      .header('etag', `"${hash}"`)
      .header('last-modified', new Date().toUTCString())
  } catch (err) {
    return logger(err)
  }
})

// SPA routes

route.GET('/assets/{subpath*}', async function handler (request: ServerRequest, h: Toolkit) {
  try {
    const { subpath } = request.params
    console.debug(`GET /assets/${subpath}`)
    const basename = pathlib.basename(subpath)
    const base = pathlib.resolve('dist/assets')
    // In the build config we told our bundler to use the `[name]-[hash]-cached` template
    // to name immutable assets. This is useful because `dist/assets/` currently includes
    // a few files without hash in their name.
    if (basename.includes('-cached')) {
      return (await h.file(pathlib.join(base, subpath)))
        .header('etag', basename)
        .header('cache-control', 'public,max-age=31536000,immutable')
    }
    // Files like `main.js` or `main.css` should be revalidated before use. Se we use the default headers.
    // This should also be suitable for serving unversioned fonts and images.
    return h.file(pathlib.join(base, subpath))
  } catch (err) {
    return logger(err)
  }
})

route.GET('/app/{path*}', function (request: ServerRequest, h: Toolkit) {
  return h.file(pathlib.resolve('./dist/index.html'))
})

route.GET('/', function (request: ServerRequest, h: Toolkit) {
  return h.redirect('/app/')
})
