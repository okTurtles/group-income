/* globals logger */

'use strict'

import sbp from '@sbp/sbp'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import { createCID } from '~/shared/functions.js'
import { SERVER_INSTANCE } from './instance-keys.js'
import path from 'path'
import chalk from 'chalk'
import './database.js'
import { registrationKey, register, getChallenge, getContractSalt, updateContractSalt } from './zkppSalt.js'

// Constant-time equal
const ctEq = (expected: string, actual: string) => {
  let r = actual.length ^ expected.length
  for (let i = 0; i < actual.length; i++) {
    r |= actual.codePointAt(i) ^ expected.codePointAt(i)
  }
  return r === 0
}

const Boom = require('@hapi/boom')
const Joi = require('@hapi/joi')
const isCheloniaDashboard = process.env.IS_CHELONIA_DASHBOARD_DEV
const staticServeConfig = {
  routePath: isCheloniaDashboard ? '/dashboard/{path*}' : '/app/{path*}',
  distAssets: path.resolve(isCheloniaDashboard ? 'dist-dashboard/assets' : 'dist/assets'),
  distIndexHtml: path.resolve(isCheloniaDashboard ? './dist-dashboard/index.html' : './dist/index.html'),
  redirect: isCheloniaDashboard ? '/dashboard/' : '/app/'
}

const route = new Proxy({}, {
  get: function (obj, prop) {
    return function (path: string, options: Object, handler: Function | Object) {
      sbp('okTurtles.data/apply', SERVER_INSTANCE, function (server: Object) {
        server.route({ path, method: prop, options, handler })
      })
    }
  }
})

// RESTful API routes

// NOTE: We could get rid of this RESTful API and just rely on pubsub.js to do this
//       —BUT HTTP2 might be better than websockets and so we keep this around.
//       See related TODO in pubsub.js and the reddit discussion link.
route.POST('/event', {
  auth: {
    strategy: 'gi-auth',
    mode: 'optional'
  },
  validate: { payload: Joi.string().required() }
}, async function (request, h) {
  // TODO: Update this regex once `chel` uses prefixed manifests
  const manifestRegex = /^z9brRu3V[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{44}$/
  try {
    console.debug('/event handler')
    const deserializedHEAD = GIMessage.deserializeHEAD(request.payload)
    try {
      if (!manifestRegex.test(deserializedHEAD.head.manifest)) {
        return Boom.badData('Invalid manifest')
      }
      const credentials = request.auth.credentials
      // Only allow identity contracts to be created without attribution
      if (!credentials?.billableContractID && deserializedHEAD.contractID === deserializedHEAD.hash) {
        const manifest = await sbp('chelonia/db/get', deserializedHEAD.head.manifest)
        const parsedManifest = JSON.parse(manifest)
        const { name } = JSON.parse(parsedManifest.body)
        if (name !== 'gi.contracts/identity') return Boom.unauthorized('This contract type requires ownership information', 'shelter')
      }
      await sbp('backend/server/handleEntry', deserializedHEAD, request.payload)
      if (deserializedHEAD.contractID === deserializedHEAD.hash) {
        // Store attribution information
        if (credentials?.billableContractID) {
          await sbp('backend/server/saveOwner', credentials.billableContractID, deserializedHEAD.contractID)
        // A billable entity has been created
        } else {
          await sbp('backend/server/registerBillableEntity', deserializedHEAD.contractID)
        }
        // If this is the first message in a contract and the
        // `shelter-namespace-registration` header is present, proceed with also
        // registering a name for the new contract
        const name = request.headers['shelter-namespace-registration']
        if (name && !name.startsWith('_private')) {
        // Name registation is enabled only for identity contracts
          const cheloniaState = sbp('chelonia/rootState')
          if (cheloniaState.contracts[deserializedHEAD.contractID]?.type === 'gi.contracts/identity') {
            const r = await sbp('backend/db/registerName', name, deserializedHEAD.contractID)
            if (Boom.isBoom(r)) {
              return r
            }
          }
        }
      }
      // Store size information
      await sbp('backend/server/updateSize', deserializedHEAD.contractID, Buffer.byteLength(request.payload))
    } catch (err) {
      console.error(err, chalk.bold.yellow(err.name))
      if (err.name === 'ChelErrorDBBadPreviousHEAD' || err.name === 'ChelErrorAlreadyProcessed') {
        const HEADinfo = await sbp('chelonia/db/latestHEADinfo', deserializedHEAD.contractID) ?? { HEAD: null, height: 0 }
        const r = Boom.conflict(err.message, { HEADinfo })
        Object.assign(r.output.headers, {
          'shelter-headinfo-head': HEADinfo.HEAD,
          'shelter-headinfo-height': HEADinfo.height
        })
        return r
      } else if (err.name === 'ChelErrorSignatureError') {
        return Boom.badData('Invalid signature')
      } else if (err.name === 'ChelErrorSignatureKeyUnauthorized') {
        return Boom.forbidden('Unauthorized signing key')
      }
      throw err // rethrow error
    }
    return deserializedHEAD.hash
  } catch (err) {
    logger.error(err, 'POST /event', err.message)
    return err
  }
})

route.GET('/eventsAfter/{contractID}/{since}/{limit?}', {}, async function (request, h) {
  const { contractID, since, limit } = request.params
  try {
    if (contractID.startsWith('_private') || since.startsWith('_private')) {
      return Boom.notFound()
    }

    const stream = await sbp('backend/db/streamEntriesAfter', contractID, since, limit)
    // "On an HTTP server, make sure to manually close your streams if a request is aborted."
    // From: http://knexjs.org/#Interfaces-Streams
    //       https://github.com/tgriesser/knex/wiki/Manually-Closing-Streams
    // Plus: https://hapijs.com/api#request-events
    // request.on('disconnect', stream.end.bind(stream))
    // NOTE: since rewriting database.js to remove objection.js and knex,
    //       we're currently returning a Readable stream, which doesn't have
    //       '.end'. If there are any issues we can try switching to returning a
    //       Writable stream. Both types however do have .destroy.
    request.events.once('disconnect', stream.destroy.bind(stream))
    return stream
  } catch (err) {
    logger.error(err, `GET /eventsAfter/${contractID}/${since}`, err.message)
    return err
  }
})

/*
// The following endpoint is disabled because name registrations are handled
// through the `shelter-namespace-registration` header when registering a
// new contract
route.POST('/name', {
  validate: {
    payload: Joi.object({
      name: Joi.string().required(),
      value: Joi.string().required()
    })
  }
}, async function (request, h) {
  try {
    const { name, value } = request.payload
    if (value.startsWith('_private')) return Boom.badData()
    return await sbp('backend/db/registerName', name, value)
  } catch (err) {
    logger.error(err, 'POST /name', err.message)
    return err
  }
})
*/

route.GET('/name/{name}', {}, async function (request, h) {
  const { name } = request.params
  try {
    return await sbp('backend/db/lookupName', name)
  } catch (err) {
    logger.error(err, `GET /name/${name}`, err.message)
    return err
  }
})

route.GET('/latestHEADinfo/{contractID}', {
  cache: { otherwise: 'no-store' }
}, async function (request, h) {
  const { contractID } = request.params
  try {
    if (contractID.startsWith('_private')) return Boom.notFound()
    const HEADinfo = await sbp('chelonia/db/latestHEADinfo', contractID)
    if (!HEADinfo) {
      console.warn(`[backend] latestHEADinfo not found for ${contractID}`)
      return Boom.notFound()
    }
    return HEADinfo
  } catch (err) {
    logger.error(err, `GET /latestHEADinfo/${contractID}`, err.message)
    return err
  }
})

route.GET('/time', {}, function (request, h) {
  return new Date().toISOString()
})

// TODO: if the browser deletes our cache then not everyone
//       has a complete copy of the data and can act as a
//       new coordinating server... I don't like that.

const MEGABYTE = 1048576 // TODO: add settings for these
const SECOND = 1000

// API endpoint to check for streams support
route.POST('/streams-test', {
  payload: {
    parse: 'false'
  }
},
function (request, h) {
  if (
    request.payload.byteLength === 2 &&
    Buffer.from(request.payload).toString() === 'ok'
  ) {
    return h.response().code(204)
  } else {
    return Boom.badRequest()
  }
}
)

// File upload route.
// If accepted, the file will be stored in Chelonia DB.
route.POST('/file', {
  auth: {
    strategies: ['gi-auth'],
    mode: 'required'
  },
  payload: {
    parse: true,
    output: 'stream',
    multipart: { output: 'annotated' },
    allow: 'multipart/form-data',
    failAction: function (request, h, err) {
      console.error(err, 'failAction error')
      return err
    },
    maxBytes: 6 * MEGABYTE, // TODO: make this a configurable setting
    timeout: 10 * SECOND // TODO: make this a configurable setting
  }
}, async function (request, h) {
  try {
    console.info('FILE UPLOAD!')
    const credentials = request.auth.credentials
    if (!credentials?.billableContractID) {
      return Boom.unauthorized('Uploading files requires ownership information', 'shelter')
    }
    const manifestMeta = request.payload['manifest']
    if (typeof manifestMeta !== 'object') return Boom.badRequest('missing manifest')
    if (manifestMeta.filename !== 'manifest.json') return Boom.badRequest('wrong manifest filename')
    if (!(manifestMeta.payload instanceof Uint8Array)) return Boom.badRequest('wrong manifest format')
    const manifest = (() => {
      try {
        return JSON.parse(Buffer.from(manifestMeta.payload).toString())
      } catch {
        throw Boom.badData('Error parsing manifest')
      }
    })()
    if (typeof manifest !== 'object') return Boom.badData('manifest format is invalid')
    if (manifest.version !== '1.0.0') return Boom.badData('unsupported manifest version')
    if (manifest.cipher !== 'aes256gcm') return Boom.badData('unsupported cipher')
    if (!Array.isArray(manifest.chunks) || !manifest.chunks.length) return Boom.badData('missing chunks')

    // Now that the manifest format looks right, validate the chunks
    let ourSize = 0
    const chunks = manifest.chunks.map((chunk, i) => {
      // Validate the chunk information
      if (
        !Array.isArray(chunk) ||
        chunk.length !== 2 ||
        typeof chunk[0] !== 'number' ||
        typeof chunk[1] !== 'string' ||
        !Number.isSafeInteger(chunk[0]) ||
        chunk[0] <= 0
      ) {
        throw Boom.badData('bad chunk description')
      }
      if (!request.payload[i] || !(request.payload[i].payload instanceof Uint8Array)) {
        throw Boom.badRequest('chunk missing in submitted data')
      }
      const ourHash = createCID(request.payload[i].payload)
      if (request.payload[i].payload.byteLength !== chunk[0]) {
        throw Boom.badRequest('bad chunk size')
      }
      if (ourHash !== chunk[1]) {
        throw Boom.badRequest('bad chunk hash')
      }
      // We're done validating the chunk
      ourSize += chunk[0]
      return [ourHash, request.payload[i].payload]
    })
    // Finally, verify the size is correct
    if (ourSize !== manifest.size) return Boom.badRequest('Mismatched total size')

    const manifestHash = createCID(manifestMeta.payload)

    // Ensure that the manifest doesn't exist
    if (await sbp('chelonia/db/get', manifestHash)) {
      throw new Error(`Manifest ${manifestHash} already exists`)
    }
    // Ensure that the chunks do not exist
    await Promise.all(chunks.map(async ([cid]) => {
      const exists = !!(await sbp('chelonia/db/get', cid))
      if (exists) {
        throw new Error(`Chunk ${cid} already exists`)
      }
    }))
    // Now, store all chunks and the manifest
    await Promise.all(chunks.map(([cid, data]) => sbp('chelonia/db/set', cid, data)))
    await sbp('chelonia/db/set', manifestHash, manifestMeta.payload)
    // Store attribution information
    await sbp('backend/server/saveOwner', credentials.billableContractID, manifestHash)
    // Store size information
    await sbp('backend/server/updateSize', manifestHash, manifest.size + manifestMeta.payload.byteLength)
    // Generate and store deletion token
    const deletionToken = sbp('backend/server/saveDeletionToken', manifestHash)
    return h.response(manifestHash).header('shelter-deletion-token', deletionToken)
  } catch (err) {
    logger.error(err, 'POST /file', err.message)
    return err
  }
})

// Serve data from Chelonia DB.
// Note that a `Last-Modified` header isn't included in the response.
route.GET('/file/{hash}', {
  cache: {
    // Do not set other cache options here, to make sure the 'otherwise' option
    // will be used so that the 'immutable' directive gets included.
    otherwise: 'public,max-age=31536000,immutable'
  }
}, async function (request, h) {
  const { hash } = request.params
  console.debug(`GET /file/${hash}`)

  if (hash.startsWith('_private')) {
    return Boom.notFound()
  }

  const blobOrString = await sbp('chelonia/db/get', `any:${hash}`)
  if (!blobOrString) {
    return Boom.notFound()
  }
  return h.response(blobOrString).etag(hash)
})

route.POST('/deleteFile/{hash}', {
  auth: {
    strategies: ['gi-auth', 'gi-bearer'],
    mode: 'required'
  }
}, async function (request, h) {
  const { hash } = request.params
  const strategy = request.auth.strategy
  if (!hash || hash.startsWith('_private')) return Boom.notFound()
  const owner = await sbp('chelonia/db/get', `_private_owner_${hash}`)
  if (!owner) {
    return Boom.notFound()
  }

  switch (strategy) {
    case 'gi-auth': {
      let ultimateOwner = owner
      let count = 0
      // Walk up the ownership tree
      do {
        const owner = await sbp('chelonia/db/get', `_private_owner_${ultimateOwner}`)
        if (owner) {
          ultimateOwner = owner
          count++
        } else {
          break
        }
      // Prevent an infinite loop
      } while (count < 128)
      if (!ctEq(request.auth.credentials.billableContractID, ultimateOwner)) {
        return Boom.unauthorized('Invalid token', 'bearer')
      }
      break
    }
    case 'gi-bearer': {
      const expectedToken = await sbp('chelonia/db/get', `_private_deletionToken_${hash}`)
      if (!expectedToken) {
        return Boom.notFound()
      }
      const token = request.auth.credentials.token
      // Constant-time comparison
      if (!ctEq(expectedToken, token)) {
        return Boom.unauthorized('Invalid token', 'bearer')
      }
      break
    }
    default:
      return Boom.unauthorized('Missing or invalid auth strategy')
  }

  // Authentication passed, now proceed to delete the file and its associated
  // keys
  const rawManifest = await sbp('chelonia/db/get', hash)
  if (!rawManifest) return Boom.notFound()
  try {
    const manifest = JSON.parse(rawManifest)
    if (!manifest || typeof manifest !== 'object') return Boom.badData('manifest format is invalid')
    if (manifest.version !== '1.0.0') return Boom.badData('unsupported manifest version')
    if (!Array.isArray(manifest.chunks) || !manifest.chunks.length) return Boom.badData('missing chunks')
    // Delete all chunks
    await Promise.all(manifest.chunks.map(([, cid]) => sbp('chelonia/db/delete', cid)))
  } catch (e) {
    console.warn(e, `Error parsing manifest for ${hash}. It's probably not a file manifest.`)
    return Boom.notFound()
  }
  await sbp('chelonia/db/delete', hash)
  await sbp('chelonia/db/delete', `_private_owner_${hash}`)
  await sbp('chelonia/db/delete', `_private_size_${hash}`)
  const resourcesKey = `_private_resources_${owner}`
  // Use a queue for atomicity
  await sbp('okTurtles.eventQueue/queueEvent', resourcesKey, async () => {
    const existingResources = await sbp('chelonia/db/get', resourcesKey)
    if (!existingResources) return
    if (existingResources.endsWith(hash)) {
      await sbp('chelonia/db/set', resourcesKey, existingResources.slice(0, -hash.length - 1))
      return
    }
    const hashIndex = existingResources.indexOf(hash + '\x00')
    if (hashIndex === -1) return
    await sbp('chelonia/db/set', resourcesKey, existingResources.slice(0, hashIndex) + existingResources.slice(hashIndex + hash.length + 1))
  })

  return h.response()
})

// SPA routes

route.GET('/assets/{subpath*}', {
  ext: {
    onPostHandler: {
      method (request, h) {
        // since our JS is placed under /assets/ and since service workers
        // have their scope limited by where they are, we must add this
        // header to allow the service worker to function. Details:
        // https://w3c.github.io/ServiceWorker/#service-worker-allowed
        if (request.path.includes('assets/js/sw-')) {
          console.debug('adding header: Service-Worker-Allowed /')
          request.response.header('Service-Worker-Allowed', '/')
        }
        return h.continue
      }
    }
  },
  files: {
    relativeTo: staticServeConfig.distAssets
  }
}, function (request, h) {
  const { subpath } = request.params
  const basename = path.basename(subpath)
  console.debug(`GET /assets/${subpath}`)
  // In the build config we told our bundler to use the `[name]-[hash]-cached` template
  // to name immutable assets. This is useful because `dist/assets/` currently includes
  // a few files without hash in their name.
  if (basename.includes('-cached')) {
    return h.file(subpath, { etagMethod: false })
      .etag(basename)
      .header('Cache-Control', 'public,max-age=31536000,immutable')
  }
  // Files like `main.js` or `main.css` should be revalidated before use. Se we use the default headers.
  // This should also be suitable for serving unversioned fonts and images.
  return h.file(subpath)
})

route.GET(staticServeConfig.routePath, {}, {
  file: staticServeConfig.distIndexHtml
})

route.GET('/', {}, function (req, h) {
  return h.redirect(staticServeConfig.redirect)
})

route.POST('/zkpp/register/{name}', {
  auth: {
    strategy: 'gi-auth',
    mode: 'optional'
  },
  validate: {
    payload: Joi.alternatives([
      {
        // b is a hash of a random public key (`g^r`) with secret key `r`,
        // which is used by the requester to commit to that particular `r`
        b: Joi.string().required()
      },
      {
        // `r` is the value used to derive `b` (in this case, it's the public
        // key `g^r`)
        r: Joi.string().required(),
        // `s` is an opaque (to the client) value that was earlier returned by
        // the server
        s: Joi.string().required(),
        // `sig` is an opaque (to the client) value returned by the server
        // to validate the request (ensuring that (`r`, `s`) come from a
        // previous request
        sig: Joi.string().required(),
        // `Eh` is the  Eh = E_{S_A + S_C}(h), where S_A and S_C are salts and
        //                                     h = H\_{S_A}(P)
        Eh: Joi.string().required()
      }
    ])
  }
}, async function (req, h) {
  if (!req.payload['b']) {
    const credentials = req.auth.credentials
    if (!credentials?.billableContractID) {
      return Boom.unauthorized('Registering a salt requires ownership information', 'shelter')
    }
    if (req.params['name'].startsWith('_private')) return Boom.notFound()
    console.error({ name: req.params.name, x: 'foo' })
    const contractID = await sbp('backend/db/lookupName', req.params['name'])
    if (contractID !== credentials.billableContractID) {
      // This ensures that only the owner of the contract can set a salt for it,
      // closing a small window of opportunity(*) during which an attacker could
      // potentially lock out a new user from their account by registering a
      // different salt.
      // (*) This is right between the moment an OP_CONTRACT is sent and the
      // time this endpoint is called, which should follow almost immediately after.
      return Boom.forbidden('Only the owner of this resource may set a password hash')
    }
  }
  try {
    if (req.payload['b']) {
      const result = await registrationKey(req.params['name'], req.payload['b'])

      if (result) {
        return result
      }
    } else {
      const result = await register(req.params['name'], req.payload['r'], req.payload['s'], req.payload['sig'], req.payload['Eh'])

      if (result) {
        return result
      }
    }
  } catch (e) {
    const ip = req.info.remoteAddress
    console.error(e, 'Error at POST /zkpp/{name}: ' + e.message, { ip })
  }

  return Boom.internal('internal error')
})

route.GET('/zkpp/{name}/auth_hash', {
  validate: {
    query: Joi.object({ b: Joi.string().required() })
  }
}, async function (req, h) {
  if (req.params['name'].startsWith('_private')) return Boom.notFound()
  try {
    const challenge = await getChallenge(req.params['name'], req.query['b'])

    return challenge || Boom.notFound()
  } catch (e) {
    const ip = req.info.remoteAddress
    console.error(e, 'Error at GET /zkpp/{name}/auth_hash: ' + e.message, { ip })
  }

  return Boom.internal('internal error')
})

route.GET('/zkpp/{name}/contract_hash', {
  validate: {
    query: Joi.object({
      r: Joi.string().required(),
      s: Joi.string().required(),
      sig: Joi.string().required(),
      hc: Joi.string().required()
    })
  }
}, async function (req, h) {
  if (req.params['name'].startsWith('_private')) return Boom.notFound()
  try {
    const salt = await getContractSalt(req.params['name'], req.query['r'], req.query['s'], req.query['sig'], req.query['hc'])

    if (salt) {
      return salt
    }
  } catch (e) {
    const ip = req.info.remoteAddress
    console.error(e, 'Error at GET /zkpp/{name}/contract_hash: ' + e.message, { ip })
  }

  return Boom.internal('internal error')
})

route.POST('/zkpp/updatePasswordHash/{name}', {
  validate: {
    payload: Joi.object({
      r: Joi.string().required(),
      s: Joi.string().required(),
      sig: Joi.string().required(),
      hc: Joi.string().required(),
      Ea: Joi.string().required()
    })
  }
}, async function (req, h) {
  if (req.params['name'].startsWith('_private')) return Boom.notFound()
  try {
    const result = await updateContractSalt(req.params['name'], req.payload['r'], req.payload['s'], req.payload['sig'], req.payload['hc'], req.payload['Ea'])

    if (result) {
      return result
    }
  } catch (e) {
    const ip = req.info.remoteAddress
    console.error(e, 'Error at POST /zkpp/updatePasswordHash/{name}: ' + e.message, { ip })
  }

  return Boom.internal('internal error')
})
