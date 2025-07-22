/* globals logger */

'use strict'

import sbp from '@sbp/sbp'
import Bottleneck from 'bottleneck'
import chalk from 'chalk'
import { isIP } from 'node:net'
import path from 'path'
import { Buffer } from 'node:buffer'
import { SPMessage } from '@chelonia/lib/SPMessage'
import { blake32Hash, createCID, maybeParseCID, multicodes } from '@chelonia/lib/functions'
import { appendToIndexFactory, lookupUltimateOwner } from './database.js'
import { SERVER_INSTANCE } from './instance-keys.js'
import { getChallenge, getContractSalt, redeemSaltRegistrationToken, redeemSaltUpdateToken, register, registrationKey, updateContractSalt } from './zkppSalt.js'

const MEGABYTE = 1048576 // TODO: add settings for these
const SECOND = 1000

// Regexes validated as safe with <https://devina.io/redos-checker>
const CID_REGEX = /^z[1-9A-HJ-NP-Za-km-z]{8,72}$/
// eslint-disable-next-line no-control-regex
const KV_KEY_REGEX = /^(?!_private)[^\x00]{1,256}$/
// Rules from validateUsername:
//   - Length: 1-80
//   - Can't start or end with _ or -
//   - No two consecutive - or _
//   - Allowed characters: lowercase letters, numbers, underscore and dashes
const NAME_REGEX = /^(?![_-])((?!([_-])\2)[a-z\d_-]){1,80}(?<![_-])$/
const POSITIVE_INTEGER_REGEX = /^\d{1,16}$/

const FILE_UPLOAD_MAX_BYTES = parseInt(process.env.FILE_UPLOAD_MAX_BYTES) || 30 * MEGABYTE
const SIGNUP_LIMIT_MIN = parseInt(process.env.SIGNUP_LIMIT_MIN) || 2
const SIGNUP_LIMIT_HOUR = parseInt(process.env.SIGNUP_LIMIT_HOUR) || 10
const SIGNUP_LIMIT_DAY = parseInt(process.env.SIGNUP_LIMIT_DAY) || 50
const SIGNUP_LIMIT_DISABLED = process.env.NODE_ENV !== 'production' || process.env.SIGNUP_LIMIT_DISABLED === 'true'
const limiterPerMinute = new Bottleneck.Group({
  strategy: Bottleneck.strategy.LEAK,
  highWater: 0,
  reservoir: SIGNUP_LIMIT_MIN,
  reservoirRefreshInterval: 60 * SECOND,
  reservoirRefreshAmount: SIGNUP_LIMIT_MIN
})
const limiterPerHour = new Bottleneck.Group({
  strategy: Bottleneck.strategy.LEAK,
  highWater: 0,
  reservoir: SIGNUP_LIMIT_HOUR,
  reservoirRefreshInterval: 60 * 60 * SECOND,
  reservoirRefreshAmount: SIGNUP_LIMIT_HOUR
})
const limiterPerDay = new Bottleneck.Group({
  strategy: Bottleneck.strategy.LEAK,
  highWater: 0,
  reservoir: SIGNUP_LIMIT_DAY,
  reservoirRefreshInterval: 24 * 60 * 60 * SECOND,
  reservoirRefreshAmount: SIGNUP_LIMIT_DAY
})

const cidLookupTable = {
  [multicodes.SHELTER_CONTRACT_MANIFEST]: 'application/vnd.shelter.contractmanifest+json',
  [multicodes.SHELTER_CONTRACT_TEXT]: 'application/vnd.shelter.contracttext',
  [multicodes.SHELTER_CONTRACT_DATA]: 'application/vnd.shelter.contractdata+json',
  [multicodes.SHELTER_FILE_MANIFEST]: 'application/vnd.shelter.filemanifest+json',
  [multicodes.SHELTER_FILE_CHUNK]: 'application/vnd.shelter.filechunk+octet-stream'
}

// Given an IPv4 or IPv6, extract a suitable key to be used for rate limiting.
// For IPv4 addresses (including IPv4 addresses embedded in IPv6 addresses),
// just use the full IPv4 address as is.
// For IPv6 addresses, discard the least significant 64 bits. This makes DoS
// harder and because of subnetting the discarded bits likely all represent
// addresses belonging to the same individual.
// Note: link-local IPv6 addresses aren't transformed and used in full.
// See: <https://github.com/okTurtles/group-income/issues/2832>
const limiterKey = (ip: string) => {
  const ipVersion = isIP(ip)
  if (ipVersion === 4) {
    return ip
  } else if (ipVersion === 6) {
    // Likely IPv6
    const [address, zoneIdx] = ip.split('%')
    const segments = address.split(':')

    // Is this a compressed form IPv6 address?
    let isCompressed = false
    for (let i = 0; i < segments.length - 1; i++) {
      // Compressed form address
      if (!isCompressed && segments[i] === '') {
        const requiredSegments = 8 - (segments.length - 1)
        if (requiredSegments < 0) {
          throw new Error('Invalid IPv6 address: too many segments')
        }
        if ((i === 0 || i === segments.length - 2) && segments[i + 1] === '') {
          segments[i + 1] = '0'
        }
        if (i === 0 && segments.length === 3 && segments[i + 2] === '') {
          segments[i + 2] = '0'
        }
        segments.splice(i, 1, ...new Array(requiredSegments).fill('0'))
        isCompressed = true
        continue
      }
      // Remove leading zeroes
      segments[i] = segments[i].replace(/^0+/, '0')
    }

    if (segments.length === 8 && isIP(segments[7]) === 4) {
      // IPv4-embedded, IPv4-mapped and IPv4-translated addresses are returned
      // as IPv4
      return segments[7]
    } else if (segments.length === 8) {
      if (zoneIdx) {
        segments[7] = segments[7].replace(/^0+/, '0')
        // Use tagged (link-local) addresses in full
        return segments.join(':').toLowerCase() + '%' + zoneIdx
      } else {
        // If an IPv6 address, return the first 64 bits. This is because that's
        // the smallest possible subnet, and spammers can easily get an entire
        // /64
        return segments.slice(0, 4).join(':').toLowerCase() + '::'
      }
    } else {
      throw new Error('Invalid IPv6 address')
    }
  }

  throw new Error('Invalid address format')
}

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

const errorMapper = (e: Error) => {
  switch (e?.name) {
    case 'BackendErrorNotFound':
      return Boom.notFound()
    case 'BackendErrorGone':
      return Boom.resourceGone()
    case 'BackendErrorBadData':
      return Boom.badData(e.message)
    default:
      console.error(e, 'Unexpected backend error')
      return Boom.internal(e.message ?? 'internal error')
  }
}

// We define a `Proxy` for route so that we can use `route.VERB` syntax for
// defining routes instead of calling `server.route` with an object, and to
// dynamically get the HAPI server object from the `SERVER_INSTANCE`, which is
// defined in `server.js`.
const route = new Proxy({}, {
  get: function (obj, prop) {
    return function (path: string, options: Object, handler: Function | Object) {
      sbp('okTurtles.data/apply', SERVER_INSTANCE, function (server: Object) {
        server.route({ path, method: prop, options, handler })
      })
    }
  }
})

// helper function that returns 404 and prevents client from caching the 404 response
// which can sometimes break things: https://github.com/okTurtles/group-income/issues/2608
function notFoundNoCache (h) {
  return h.response().code(404).header('Cache-Control', 'no-store')
}

// RESTful API routes

// NOTE: We could get rid of this RESTful API and just rely on pubsub.js to do this
//       —BUT HTTP2 might be better than websockets and so we keep this around.
//       See related TODO in pubsub.js and the reddit discussion link.
route.POST('/event', {
  auth: {
    strategy: 'chel-shelter',
    mode: 'optional'
  },
  validate: {
    headers: Joi.object({
      'shelter-namespace-registration': Joi.string().regex(NAME_REGEX)
    }),
    options: {
      allowUnknown: true
    },
    payload: Joi.string().required()
  }
}, async function (request, h) {
  if (process.env.CHELONIA_ARCHIVE_MODE) return Boom.notImplemented('Server in archive mode')
  // IMPORTANT: IT IS A REQUIREMENT THAT ANY PROXY SERVERS (E.G. nginx) IN FRONT OF US SET THE
  // X-Real-IP HEADER! OTHERWISE THIS IS EASILY SPOOFED!
  const ip = request.headers['x-real-ip'] || request.info.remoteAddress
  try {
    const deserializedHEAD = SPMessage.deserializeHEAD(request.payload)
    try {
      const parsed = maybeParseCID(deserializedHEAD.head.manifest)
      if (parsed?.code !== multicodes.SHELTER_CONTRACT_MANIFEST) {
        return Boom.badData('Invalid manifest')
      }
      const credentials = request.auth.credentials
      // Only allow identity contracts to be created without attribution
      if (!credentials?.billableContractID && deserializedHEAD.isFirstMessage) {
        const manifest = await sbp('chelonia.db/get', deserializedHEAD.head.manifest)
        const parsedManifest = JSON.parse(manifest)
        const { name } = JSON.parse(parsedManifest.body)
        if (name !== 'gi.contracts/identity') return Boom.unauthorized('This contract type requires ownership information', 'shelter')
        // rate limit signups in production
        if (!SIGNUP_LIMIT_DISABLED) {
          try {
            // See discussion: https://github.com/okTurtles/group-income/pull/2280#pullrequestreview-2219347378
            const keyedIp = limiterKey(ip)
            await limiterPerMinute.key(keyedIp).schedule(() => Promise.resolve())
            await limiterPerHour.key(keyedIp).schedule(() => Promise.resolve())
            await limiterPerDay.key(keyedIp).schedule(() => Promise.resolve())
          } catch {
            console.warn('rate limit hit for IP:', ip)
            throw Boom.tooManyRequests('Rate limit exceeded')
          }
        }
      }
      const saltUpdateToken = request.headers['shelter-salt-update-token']
      let updateSalts
      if (saltUpdateToken) {
        // If we've got a salt update token (i.e., a password change),
        // validate the token
        updateSalts = await redeemSaltUpdateToken(deserializedHEAD.contractID, saltUpdateToken)
      }
      await sbp('backend/server/handleEntry', deserializedHEAD, request.payload)
      // If it's a salt update, do it now after handling the message. This way
      // we make it less likely that someone will end up locked out from their
      // identity contract.
      await updateSalts?.(deserializedHEAD.hash)
      if (deserializedHEAD.isFirstMessage) {
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
        if (name) {
        // Name registation is enabled only for identity contracts
          const cheloniaState = sbp('chelonia/rootState')
          if (cheloniaState.contracts[deserializedHEAD.contractID]?.type === 'gi.contracts/identity') {
            const r = await sbp('backend/db/registerName', name, deserializedHEAD.contractID)
            if (Boom.isBoom(r)) {
              return r
            }
            const saltRegistrationToken = request.headers['shelter-salt-registration-token']
            console.info(`new user: ${name}=${deserializedHEAD.contractID} (${ip})`)
            if (saltRegistrationToken) {
              // If we've got a salt registration token, redeem it
              await redeemSaltRegistrationToken(name, deserializedHEAD.contractID, saltRegistrationToken)
            }
          }
        }
        const deletionTokenDgst = request.headers['shelter-deletion-token-digest']
        if (deletionTokenDgst) {
          await sbp('chelonia.db/set', `_private_deletionTokenDgst_${deserializedHEAD.contractID}`, deletionTokenDgst)
        }
      }
      // Store size information
      await sbp('backend/server/updateSize', deserializedHEAD.contractID, Buffer.byteLength(request.payload), deserializedHEAD.isFirstMessage && !credentials?.billableContractID ? deserializedHEAD.contractID : undefined)
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
    err.ip = ip
    logger.error(err, 'POST /event', err.message)
    return err
  }
})

route.GET('/eventsAfter/{contractID}/{since}/{limit?}', {
  validate: {
    params: Joi.object({
      contractID: Joi.string().regex(CID_REGEX).required(),
      since: Joi.string().regex(POSITIVE_INTEGER_REGEX).required(),
      limit: Joi.string().regex(POSITIVE_INTEGER_REGEX)
    }),
    query: Joi.object({
      keyOps: Joi.boolean()
    })
  }
}, async function (request, h) {
  const { contractID, since, limit } = request.params
  const ip = request.headers['x-real-ip'] || request.info.remoteAddress
  try {
    const parsed = maybeParseCID(contractID)
    if (parsed?.code !== multicodes.SHELTER_CONTRACT_DATA) {
      return Boom.badRequest()
    }

    const stream = await sbp('backend/db/streamEntriesAfter', contractID, Number(since), limit == null ? undefined : Number(limit), { keyOps: !!request.query['keyOps'] })
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
    err.ip = ip
    logger.error(err, `GET /eventsAfter/${contractID}/${since}`, err.message)
    return err
  }
})

// This endpoint returns to anyone in possession of a contract's SAK all of the
// resources that that contract owns (without recursion). This is useful for
// APIs and for some UI actions (e.g., to warn users about resources that would
// be (cascade) deleted following a delete)
route.GET('/ownResources', {
  auth: {
    strategies: ['chel-shelter'],
    mode: 'required'
  }
}, async function (request, h) {
  const billableContractID = request.auth.credentials.billableContractID
  const resources = (await sbp('chelonia.db/get', `_private_resources_${billableContractID}`))?.split('\x00')

  return resources || []
})

if (process.env.NODE_ENV === 'development') {
  const levelToColor = {
    error: chalk.bold.red,
    warn: chalk.yellow,
    log: chalk.green,
    info: chalk.green,
    debug: chalk.blue
  }
  route.POST('/log', {
    validate: {
      payload: Joi.object({
        level: Joi.string().required(),
        value: Joi.string().required()
      })
    }
  }, function (request, h) {
    if (process.env.CHELONIA_ARCHIVE_MODE) return Boom.notImplemented('Server in archive mode')
    const ip = request.headers['x-real-ip'] || request.info.remoteAddress
    const log = levelToColor[request.payload.level]
    console.debug(chalk.bold.yellow(`REMOTE LOG (${ip}): `) + log(`[${request.payload.level}] ${request.payload.value}`))
    return h.response().code(200)
  })
}

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

route.GET('/name/{name}', {
  validate: {
    params: Joi.object({
      name: Joi.string().regex(NAME_REGEX).required()
    })
  }
}, async function (request, h) {
  const { name } = request.params
  try {
    const lookupResult = await sbp('backend/db/lookupName', name)
    return lookupResult
      ? h.response(lookupResult).type('text/plain')
      : notFoundNoCache(h)
  } catch (err) {
    logger.error(err, `GET /name/${name}`, err.message)
    return err
  }
})

route.GET('/latestHEADinfo/{contractID}', {
  cache: { otherwise: 'no-store' },
  validate: {
    params: Joi.object({
      contractID: Joi.string().regex(CID_REGEX).required()
    })
  }
}, async function (request, h) {
  const { contractID } = request.params
  try {
    const parsed = maybeParseCID(contractID)
    if (parsed?.code !== multicodes.SHELTER_CONTRACT_DATA) return Boom.badRequest()

    const HEADinfo = await sbp('chelonia/db/latestHEADinfo', contractID)
    if (HEADinfo === '') {
      return Boom.resourceGone()
    }
    if (!HEADinfo) {
      console.warn(`[backend] latestHEADinfo not found for ${contractID}`)
      return notFoundNoCache(h)
    }
    return HEADinfo
  } catch (err) {
    logger.error(err, `GET /latestHEADinfo/${contractID}`, err.message)
    return err
  }
})

route.GET('/time', {}, function (request, h) {
  return h
    .response(new Date().toISOString())
    .header('cache-control', 'no-store')
    .type('text/plain')
})

// TODO: if the browser deletes our cache then not everyone
//       has a complete copy of the data and can act as a
//       new coordinating server... I don't like that.

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

// Development file upload route. The difference between this and /file is that
// this endpoint bypasses checks in /file for well-formedness, and it also
// doesn't set or read accounting information.
// If accepted, the file will be stored in Chelonia DB.
if (process.env.NODE_ENV === 'development') {
  route.POST('/dev-file', {
    payload: {
      output: 'data',
      multipart: true,
      allow: 'multipart/form-data',
      failAction: function (request, h, err) {
        console.error('failAction error:', err)
        return err
      },
      maxBytes: 6 * MEGABYTE, // TODO: make this a configurable setting
      timeout: 10 * SECOND // TODO: make this a configurable setting
    }
  }, async function (request, h) {
    if (process.env.CHELONIA_ARCHIVE_MODE) return Boom.notImplemented('Server in archive mode')
    try {
      console.log('FILE UPLOAD!')
      const { hash, data } = request.payload
      if (!hash) return Boom.badRequest('missing hash')
      if (!data) return Boom.badRequest('missing data')

      const parsed = maybeParseCID(hash)
      if (!parsed) return Boom.badRequest('invalid hash')

      const ourHash = createCID(data, parsed.code)
      if (ourHash !== hash) {
        console.error(`hash(${hash}) != ourHash(${ourHash})`)
        return Boom.badRequest('bad hash!')
      }
      await sbp('chelonia.db/set', hash, data)
      return '/file/' + hash
    } catch (err) {
      return logger(err)
    }
  })
}

// File upload route.
// If accepted, the file will be stored in Chelonia DB.
route.POST('/file', {
  auth: {
    strategies: ['chel-shelter'],
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
    maxBytes: FILE_UPLOAD_MAX_BYTES,
    timeout: 10 * SECOND // TODO: make this a configurable setting
  }
}, async function (request, h) {
  if (process.env.CHELONIA_ARCHIVE_MODE) return Boom.notImplemented('Server in archive mode')
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
      const ourHash = createCID(request.payload[i].payload, multicodes.SHELTER_FILE_CHUNK)
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

    const manifestHash = createCID(manifestMeta.payload, multicodes.SHELTER_FILE_MANIFEST)

    // Check that we're not overwriting data. At best this is a useless operation
    // since there is no need to write things that exist. However, overwriting
    // data would also make it ambiguous in terms of ownership. For example,
    // someone could upload a file F1 using some existing chunks (from a
    // different file F2) and then request to delete their file F1, which would
    // result in corrupting F2.
    // Ensure that the manifest doesn't exist
    if (await sbp('chelonia.db/get', manifestHash)) {
      throw new Error(`Manifest ${manifestHash} already exists`)
    }
    // Ensure that the chunks do not exist
    await Promise.all(chunks.map(async ([cid]) => {
      const exists = !!(await sbp('chelonia.db/get', cid))
      if (exists) {
        throw new Error(`Chunk ${cid} already exists`)
      }
    }))
    // Now, store all chunks and the manifest
    await Promise.all(chunks.map(([cid, data]) => sbp('chelonia.db/set', cid, data)))
    await sbp('chelonia.db/set', manifestHash, manifestMeta.payload)
    // Store attribution information
    await sbp('backend/server/saveOwner', credentials.billableContractID, manifestHash)
    // Store size information
    const size = manifest.size + manifestMeta.payload.byteLength
    await sbp('backend/server/updateSize', manifestHash, size)
    await sbp('backend/server/updateContractFilesTotalSize', credentials.billableContractID, size)
    // Store deletion token
    const deletionTokenDgst = request.headers['shelter-deletion-token-digest']
    if (deletionTokenDgst) {
      await sbp('chelonia.db/set', `_private_deletionTokenDgst_${manifestHash}`, deletionTokenDgst)
    }
    return h.response(manifestHash)
  } catch (err) {
    logger.error(err, 'POST /file', err.message)
    return err
  }
})

// Serve data from Chelonia DB.
// Note that a `Last-Modified` header isn't included in the response.
route.GET('/file/{hash}', {
  validate: {
    params: Joi.object({
      hash: Joi.string().regex(CID_REGEX).required()
    })
  }
}, async function (request, h) {
  const { hash } = request.params

  const parsed = maybeParseCID(hash)
  if (!parsed) {
    return Boom.badRequest()
  }

  const blobOrString = await sbp('chelonia.db/get', `any:${hash}`)
  if (blobOrString?.length === 0) {
    return Boom.resourceGone()
  } else if (!blobOrString) {
    return notFoundNoCache(h)
  }

  const type = cidLookupTable[parsed.code] || 'application/octet-stream'

  return h
    .response(blobOrString)
    .etag(hash)
    .header('Cache-Control', 'public,max-age=31536000,immutable')
    // CSP to disable everything -- this only affects direct navigation to the
    // `/file` URL.
    // The CSP below prevents any sort of resource loading or script execution
    // on direct navigation. The `nosniff` header instructs the browser to
    // honour the provided content-type.
    .header('content-security-policy', "default-src 'none'; frame-ancestors 'none'; form-action 'none'; upgrade-insecure-requests; sandbox")
    .header('x-content-type-options', 'nosniff')
    .type(type)
})

route.POST('/deleteFile/{hash}', {
  auth: {
    // Allow file deletion, and allow either the bearer of the deletion token or
    // the file owner to delete it
    strategies: ['chel-shelter', 'chel-bearer'],
    mode: 'required'
  },
  validate: {
    params: Joi.object({
      hash: Joi.string().regex(CID_REGEX).required()
    })
  }
}, async function (request, h) {
  if (process.env.CHELONIA_ARCHIVE_MODE) return Boom.notImplemented('Server in archive mode')
  const { hash } = request.params
  const strategy = request.auth.strategy
  const parsed = maybeParseCID(hash)
  if (parsed?.code !== multicodes.SHELTER_FILE_MANIFEST) {
    return Boom.badRequest()
  }

  const owner = await sbp('chelonia.db/get', `_private_owner_${hash}`)
  if (!owner) {
    return Boom.notFound()
  }

  switch (strategy) {
    case 'chel-shelter': {
      const ultimateOwner = await lookupUltimateOwner(owner)
      // Check that the user making the request is the ultimate owner (i.e.,
      // that they have permission to delete this file)
      if (!ctEq(request.auth.credentials.billableContractID, ultimateOwner)) {
        return Boom.unauthorized('Invalid shelter auth', 'shelter')
      }
      break
    }
    case 'chel-bearer': {
      const expectedTokenDgst = await sbp('chelonia.db/get', `_private_deletionTokenDgst_${hash}`)
      if (!expectedTokenDgst) {
        return Boom.notFound()
      }
      const tokenDgst = blake32Hash(request.auth.credentials.token)
      // Constant-time comparison
      // Check that the token provided matches the deletion token for this file
      if (!ctEq(expectedTokenDgst, tokenDgst)) {
        return Boom.unauthorized('Invalid token', 'bearer')
      }
      break
    }
    default:
      return Boom.unauthorized('Missing or invalid auth strategy')
  }

  // Authentication passed, now proceed to delete the file and its associated
  // keys
  try {
    await sbp('backend/deleteFile', hash, null, true)
    return h.response()
  } catch (e) {
    return errorMapper(e)
  }
})

route.POST('/deleteContract/{hash}', {
  auth: {
    // Allow file deletion, and allow either the bearer of the deletion token or
    // the file owner to delete it
    strategies: ['chel-shelter', 'chel-bearer'],
    mode: 'required'
  }
}, async function (request, h) {
  if (process.env.CHELONIA_ARCHIVE_MODE) return Boom.notImplemented('Server in archive mode')
  const { hash } = request.params
  const strategy = request.auth.strategy
  if (!hash || hash.startsWith('_private')) return Boom.notFound()

  switch (strategy) {
    case 'chel-shelter': {
      const owner = await sbp('chelonia.db/get', `_private_owner_${hash}`)
      if (!owner) {
        return Boom.notFound()
      }

      const ultimateOwner = await lookupUltimateOwner(owner)
      // Check that the user making the request is the ultimate owner (i.e.,
      // that they have permission to delete this file)
      if (!ctEq(request.auth.credentials.billableContractID, ultimateOwner)) {
        return Boom.unauthorized('Invalid shelter auth', 'shelter')
      }
      break
    }
    case 'chel-bearer': {
      const expectedTokenDgst = await sbp('chelonia.db/get', `_private_deletionTokenDgst_${hash}`)
      if (!expectedTokenDgst) {
        return Boom.notFound()
      }
      const tokenDgst = blake32Hash(request.auth.credentials.token)
      // Constant-time comparison
      // Check that the token provided matches the deletion token for this contract
      if (!ctEq(expectedTokenDgst, tokenDgst)) {
        return Boom.unauthorized('Invalid token', 'bearer')
      }
      break
    }
    default:
      return Boom.unauthorized('Missing or invalid auth strategy')
  }

  const username = await sbp('chelonia.db/get', `_private_cid2name_${hash}`)
  // Authentication passed, now proceed to delete the contract and its associated
  // keys
  try {
    const [id] = sbp('chelonia.persistentActions/enqueue', ['backend/deleteContract', hash, null, true])
    if (username) {
      const ip = request.headers['x-real-ip'] || request.info.remoteAddress
      console.info({ contractID: hash, username, ip, taskId: id }, 'Scheduled deletion on named contract')
    }
    // We return the queue ID to allow users to track progress
    // TODO: Tracking progress not yet implemented
    return h.response({ id }).code(202)
  } catch (e) {
    return errorMapper(e)
  }
})

route.POST('/kv/{contractID}/{key}', {
  auth: {
    strategies: ['chel-shelter'],
    mode: 'required'
  },
  payload: {
    parse: false,
    maxBytes: 6 * MEGABYTE, // TODO: make this a configurable setting
    timeout: 10 * SECOND // TODO: make this a configurable setting
  },
  validate: {
    params: Joi.object({
      contractID: Joi.string().regex(CID_REGEX).required(),
      key: Joi.string().regex(KV_KEY_REGEX).required()
    })
  }
}, function (request, h) {
  if (process.env.CHELONIA_ARCHIVE_MODE) return Boom.notImplemented('Server in archive mode')
  const { contractID, key } = request.params

  const parsed = maybeParseCID(contractID)
  if (parsed?.code !== multicodes.SHELTER_CONTRACT_DATA) {
    return Boom.badRequest()
  }

  if (!ctEq(request.auth.credentials.billableContractID, contractID)) {
    return Boom.unauthorized(null, 'shelter')
  }

  // Use a queue to prevent race conditions (for example, writing to a contract
  // that's being deleted or updated)
  return sbp('chelonia/queueInvocation', contractID, async () => {
    const existing = await sbp('chelonia.db/get', `_private_kv_${contractID}_${key}`)

    // Some protection against accidental overwriting by implementing the if-match
    // header
    // If-Match contains a list of ETags or '*'
    // If `If-Match` contains a known ETag, allow the request through, otherwise
    // return 412 Precondition Failed.
    // This is useful to clients to avoid accidentally overwriting existing data
    // For example, client A and client B want to write to key 'K', which contains
    // an array. Let's say that the array is originally empty (`[]`) and A and B
    // want to append `A` and `B` to it, respectively. If both write at the same
    // time, the following could happen:
    // t = 0: A reads `K`, gets `[]`
    // t = 1: B reads `K`, gets `[]`
    // t = 2: A writes `['A']` to `K`
    // t = 3: B writes `['B']` to `K` <-- ERROR: B should have written `['A', 'B']`
    // To avoid this situation, A and B could use `If-Match`, which would have
    // given B a 412 response
    const expectedEtag = request.headers['if-match']
    if (!expectedEtag) {
      return Boom.badRequest('if-match is required')
    }
    // "Quote" string (to match ETag format)
    const cid = existing ? createCID(existing, multicodes.RAW) : ''

    if (expectedEtag === '*') {
    // pass through
    } else {
      if (!expectedEtag.split(',').map(v => v.trim()).includes(`"${cid}"`)) {
        // We need this `x-cid` because HAPI modifies Etags
        return h.response(existing || '').etag(cid).header('x-cid', `"${cid}"`).code(412)
      }
    }

    try {
      const serializedData = JSON.parse(request.payload.toString())
      const { contracts } = sbp('chelonia/rootState')
      // Check that the height is the latest value. Not only should the height be
      // the latest, but also enforcing this lets us check that signatures are
      // using the latest (cryptograhpic) keys. Since the KV is detached from the
      // contract, in isolation it's impossible to know if an old signature is
      // just because it was created in the past, or if it's because someone
      // is reusing a previously good key that has since been revoked.
      if (contracts[contractID].height !== Number(serializedData.height)) {
        return h.response(existing || '').etag(cid).header('x-cid', `"${cid}"`).code(409)
      }
      // Check that the signature is valid
      sbp('chelonia/parseEncryptedOrUnencryptedDetachedMessage', {
        contractID,
        serializedData,
        meta: key
      })
    } catch (e) {
      return Boom.badData()
    }

    const existingSize = existing ? Buffer.from(existing).byteLength : 0
    await sbp('chelonia.db/set', `_private_kv_${contractID}_${key}`, request.payload)
    await sbp('backend/server/updateSize', contractID, request.payload.byteLength - existingSize)
    await appendToIndexFactory(`_private_kvIdx_${contractID}`)(key)
    // No await on broadcast for faster responses
    sbp('backend/server/broadcastKV', contractID, key, request.payload.toString()).catch(e => console.error(e, 'Error broadcasting KV update', contractID, key))

    return h.response().code(204)
  })
})

route.GET('/kv/{contractID}/{key}', {
  auth: {
    strategies: ['chel-shelter'],
    mode: 'required'
  },
  cache: { otherwise: 'no-store' },
  validate: {
    params: Joi.object({
      contractID: Joi.string().regex(CID_REGEX).required(),
      key: Joi.string().regex(KV_KEY_REGEX).required()
    })
  }
}, async function (request, h) {
  const { contractID, key } = request.params

  const parsed = maybeParseCID(contractID)
  if (parsed?.code !== multicodes.SHELTER_CONTRACT_DATA) {
    return Boom.badRequest()
  }

  if (!ctEq(request.auth.credentials.billableContractID, contractID)) {
    return Boom.unauthorized(null, 'shelter')
  }

  const result = await sbp('chelonia.db/get', `_private_kv_${contractID}_${key}`)
  if (!result) {
    return notFoundNoCache(h)
  }

  const cid = createCID(result, multicodes.RAW)
  return h.response(result).etag(cid).header('x-cid', `"${cid}"`)
})

route.GET('/serverMessages', { cache: { otherwise: 'no-store' } }, (request, h) => {
  if (!process.env.CHELONIA_SERVER_MESSAGES) return []
  return h.response(process.env.CHELONIA_SERVER_MESSAGES).type('application/json')
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
  validate: {
    params: Joi.object({
      name: Joi.string().regex(NAME_REGEX).required()
    }),
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
  if (process.env.CHELONIA_ARCHIVE_MODE) return Boom.notImplemented('Server in archive mode')
  const lookupResult = await sbp('backend/db/lookupName', req.params['name'])
  if (lookupResult) {
    // If the username is already registered, abort
    return Boom.conflict()
  }
  try {
    if (req.payload['b']) {
      const result = registrationKey(req.params['name'], req.payload['b'])

      if (result) {
        return result
      }
    } else {
      const result = register(req.params['name'], req.payload['r'], req.payload['s'], req.payload['sig'], req.payload['Eh'])

      if (result) {
        return result
      }
    }
  } catch (e) {
    e.ip = req.headers['x-real-ip'] || req.info.remoteAddress
    console.error(e, 'Error at POST /zkpp/{name}: ' + e.message)
  }

  return Boom.internal('internal error')
})

route.GET('/zkpp/{contractID}/auth_hash', {
  validate: {
    params: Joi.object({
      contractID: Joi.string().regex(CID_REGEX).required()
    }),
    query: Joi.object({ b: Joi.string().required() })
  }
}, async function (req, h) {
  try {
    const challenge = await getChallenge(req.params['contractID'], req.query['b'])

    return challenge || notFoundNoCache(h)
  } catch (e) {
    e.ip = req.headers['x-real-ip'] || req.info.remoteAddress
    console.error(e, 'Error at GET /zkpp/{contractID}/auth_hash: ' + e.message)
  }

  return Boom.internal('internal error')
})

route.GET('/zkpp/{contractID}/contract_hash', {
  validate: {
    params: Joi.object({
      contractID: Joi.string().regex(CID_REGEX).required()
    }),
    query: Joi.object({
      r: Joi.string().required(),
      s: Joi.string().required(),
      sig: Joi.string().required(),
      hc: Joi.string().required()
    })
  }
}, async function (req, h) {
  try {
    const salt = await getContractSalt(req.params['contractID'], req.query['r'], req.query['s'], req.query['sig'], req.query['hc'])

    if (salt) {
      return salt
    }
  } catch (e) {
    e.ip = req.headers['x-real-ip'] || req.info.remoteAddress
    console.error(e, 'Error at GET /zkpp/{contractID}/contract_hash: ' + e.message)
  }

  return Boom.internal('internal error')
})

route.POST('/zkpp/{contractID}/updatePasswordHash', {
  validate: {
    params: Joi.object({
      contractID: Joi.string().regex(CID_REGEX).required()
    }),
    payload: Joi.object({
      r: Joi.string().required(),
      s: Joi.string().required(),
      sig: Joi.string().required(),
      hc: Joi.string().required(),
      Ea: Joi.string().required()
    })
  }
}, async function (req, h) {
  if (process.env.CHELONIA_ARCHIVE_MODE) return Boom.notImplemented('Server in archive mode')
  try {
    const result = await updateContractSalt(req.params['contractID'], req.payload['r'], req.payload['s'], req.payload['sig'], req.payload['hc'], req.payload['Ea'])

    if (result) {
      return result
    }
  } catch (e) {
    e.ip = req.headers['x-real-ip'] || req.info.remoteAddress
    console.error(e, 'Error at POST /zkpp/{contractID}/updatePasswordHash: ' + e.message)
  }

  return Boom.internal('internal error')
})
