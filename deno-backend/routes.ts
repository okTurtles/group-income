import sbp from '@sbp/sbp'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.ts'
import { blake32Hash } from '~/shared/functions.ts'
import { SERVER_INSTANCE } from './instance-keys.ts'

import { badRequest } from 'pogo/lib/bang.ts'
import Router from 'pogo/lib/router.ts'

import './database.ts'
import * as pathlib from 'path'

export const router = new Router()

const route = new Proxy({}, {
  get: function (obj, prop) {
    return function (path: string, handler: Function | Object) {
      router.add({ path, method: prop, handler })
    }
  }
})

// RESTful API routes

// NOTE: We could get rid of this RESTful API and just rely on pubsub.js to do this
//       —BUT HTTP2 might be better than websockets and so we keep this around.
//       See related TODO in pubsub.js and the reddit discussion link.
route.POST('/event', async function (request, h) {
  try {
    console.log('/event handler')
    const payload = await request.raw.text();
    console.log("payload:", payload);

    const entry = GIMessage.deserialize(payload)
    await sbp('backend/server/handleEntry', entry)
    return entry.hash()
  } catch (err) {
    if (err.name === 'ChelErrorDBBadPreviousHEAD') {
      console.error(bold(yellow('ChelErrorDBBadPreviousHEAD')), err)
      return badRequest(err.message)
    }
    console.error(err)
    return err
  }
})

route.GET('/eventsSince/{contractID}/{since}', async function (request, h) {
  try {
    const { contractID, since } = request.params
    const json = await sbp('backend/db/streamEntriesSince', contractID, since)
    // Make sure to close the stream in case of disconnection."
    // request.events.once('disconnect', stream.cancel.bind(stream))
    return h.response(json).type('application/json')
  } catch (err) {
    return logger(err)
  }
})

route.POST('/name', async function (request, h) {
  try {
    console.debug('/name', request.body)
    const payload = await request.raw.json();

    const { name, value } = payload
    return await sbp('backend/db/registerName', name, value)
  } catch (err) {
    return logger(err)
  }
})

route.GET('/name/{name}', async function (request, h) {
  console.debug('GET /name/{name}', request.params.name)
  try {
    const result = await sbp('backend/db/lookupName', request.params.name)
    return result instanceof Deno.errors.NotFound ? request.response.code(404) : result
  } catch (err) {
    return (err)
  }
})

route.GET('/latestHash/{contractID}', async function handler (request, h) {
  try {
    const { contractID } = request.params
    const hash = await sbp('chelonia/db/latestHash', contractID)
    console.debug(`[backend] latestHash for ${contractID}: `, hash)
    request.response.header('cache-control', 'no-store')
    if (!hash) {
      console.warn(`[backend] latestHash not found for ${contractID}`)
      return new NotFound()
    }
    return hash
  } catch (err) {
    return logger(err)
  }
})

route.GET('/time', function (request, h) {
  request.response.header('cache-control', 'no-store')
  return new Date().toISOString()
})

// file upload related

// TODO: if the browser deletes our cache then not everyone
//       has a complete copy of the data and can act as a
//       new coordinating server... I don't like that.

const MEGABYTE = 1048576 // TODO: add settings for these
const SECOND = 1000

// TODO: only allow uploads from registered users
const fileUploadOptions = {
  output: 'data',
  multipart: true,
  allow: 'multipart/form-data',
  maxBytes: 6 * MEGABYTE, // TODO: make this a configurable setting
  timeout: 10 * SECOND // TODO: make this a configurable setting
}

route.POST('/file', async function (request, h) {
  try {
    console.log('FILE UPLOAD!')

    const formData = await request.raw.formData()
    const data = formData.get('data')
    const hash = formData.get('hash')
    if (!data) return badRequest('missing data')
    if (!hash) return badRequest('missing hash')
    
    const fileData = await new Promise((resolve, reject) => {
      const fileReader = new FileReader()
      fileReader.onload = (event) => {
        resolve(fileReader.result)
      }
      fileReader.onerror = (event) => {
        reject(fileReader.error)
      }
      fileReader.readAsArrayBuffer(data)
    })
    const ourHash = blake32Hash(new Uint8Array(fileData))
    if (ourHash !== hash) {
      console.error(`hash(${hash}) != ourHash(${ourHash})`)
      return new badRequest('bad hash!')
    }
    await sbp('backend/db/writeFileOnce', hash, fileData)
    console.log('/file/' + hash);
    return '/file/' + hash
  } catch (err) {
    console.error(err)
    return err
  }
})

route.GET('/file/{hash}', async function handler (request, h) {
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
      .header('last-modified', new Date().toGMTString())
  } catch (err) {
    console.log(err)
  }
})

// SPA routes

route.GET('/assets/{subpath*}', function handler (request, h) {
  const { subpath } = request.params
  const basename = pathlib.basename(subpath)
  console.debug(`GET /assets/${subpath}`)
  const base = pathlib.resolve('dist/assets')
  // In the build config we told our bundler to use the `[name]-[hash]-cached` template
  // to name immutable assets. This is useful because `dist/assets/` currently includes
  // a few files without hash in their name.
  if (basename.includes('-cached')) {
    return h.file(pathlib.join(base, subpath))
      .header('etag', basename)
      .header('cache-control', 'public,max-age=31536000,immutable')
  }
  // Files like `main.js` or `main.css` should be revalidated before use. Se we use the default headers.
  // This should also be suitable for serving unversioned fonts and images.
  return h.file(pathlib.join(base, subpath))
})

route.GET('/app/{path*}', function handler (req, h) {
  return h.file(pathlib.resolve('./dist/index.html'))
})

route.GET('/', function (req, h) {
  return h.redirect('/app/')
})
