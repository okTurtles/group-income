/* eslint-env mocha */
import * as Common from '@common/common.js'
import sbp from '@sbp/sbp'
import manifests from '~/frontend/model/contracts/manifests.json'
import '@chelonia/lib'
import { Secret } from '@chelonia/lib/Secret'
import { EDWARDS25519SHA512BATCH, keyId, keygen, serializeKey } from '@chelonia/crypto'

const assert = require('node:assert')
// Remove this when dropping support for Node versions lower than v20.
const File = require('buffer').File
const { readFile } = require('node:fs/promises')

async function createIdentity (username) {
  const CSK = keygen(EDWARDS25519SHA512BATCH)
  const CSKid = keyId(CSK)
  const CSKp = serializeKey(CSK, false)
  const SAK = keygen(EDWARDS25519SHA512BATCH)
  const SAKid = keyId(SAK)
  const SAKp = serializeKey(SAK, false)

  sbp('chelonia/storeSecretKeys',
    new Secret([CSK, SAK].map(key => ({ key, transient: true })))
  )

  // append random id to username to prevent conflict across runs
  // when GI_PERSIST environment variable is defined
  username = `${username}-${performance.now().toFixed(20).replace('.', '')}`
  const msg = await sbp('chelonia/out/registerContract', {
    contractName: 'gi.contracts/identity',
    keys: [
      {
        id: CSKid,
        name: 'csk',
        purpose: ['sig'],
        ringLevel: 0,
        permissions: '*',
        allowedActions: '*',
        data: CSKp
      },
      {
        id: SAKid,
        name: '#sak',
        purpose: ['sak'],
        ringLevel: 0,
        permissions: [],
        allowedActions: [],
        data: SAKp
      }
    ],
    data: {
      attributes: { username, email: 'test@email.example' }
    },
    signingKeyId: CSKid,
    namespaceRegistration: username
  })
  return msg
}

describe('avatar file serving', function () {
  const apiURL = process.env.API_URL
  const manifestCid = 'zLGQo2DimCH8QptCVN5kpvZTMZnWWtjnSrmaYMW9ptNozFcrr5kouP6u'
  const chunkCid = 'zLKHweRGqjMMYdqKhWhbRv17S84wVLeBoeaEhZvdYxoBMTTYnUmJ5CVn'
  let retPath = ''

  before('manually upload a test avatar to the file database', async () => {
    await sbp('chelonia/configure', {
      connectionURL: process.env.API_URL,
      skipSideEffects: true,
      contracts: {
        ...manifests,
        defaults: {
          allowedSelectors: [
            'chelonia/queueInvocation'
          ],
          modules: { '@common/common.js': Common },
          preferSlim: true
        }
      }
    })
    const owner = await createIdentity('avatar-caching-test')
    const fd = new FormData()
    fd.append(
      '0',
      new File(
        [await readFile(`./test/data/${chunkCid}`)],
        '0',
        { type: 'application/octet-stream' }
      )
    )
    fd.append(
      'manifest',
      new File(
        [await readFile(`./test/data/${manifestCid}`)],
        'manifest.json',
        { type: 'application/vnd.shelter.manifest' }
      )
    )
    retPath = await fetch(`${apiURL}/file`, {
      method: 'POST',
      headers: {
        authorization: sbp('chelonia/shelterAuthorizationHeader', owner.contractID())
      },
      body: fd
    }).then(r => r.text())

    assert.equal(retPath, manifestCid)
  })

  it('Should serve our test avatar with correct headers', async function () {
    const { headers } = await fetch(`${apiURL}/file/${retPath}`)

    assert.match(headers.get('cache-control'), /immutable/)
    assert.doesNotMatch(headers.get('cache-control'), /no-cache/)
    assert.equal(headers.get('content-length'), '183')
    assert.equal(headers.get('content-type'), 'application/vnd.shelter.filemanifest+json')
    assert.equal(headers.get('etag'), `"${manifestCid}"`)
    // Not checking for a `last-modified` header.
    assert.equal(headers.get('x-content-type-options'), 'nosniff')
    assert.equal(headers.get('x-frame-options'), 'deny')

    const { headers: cHeaders } = await fetch(`${apiURL}/file/${chunkCid}`)
    assert.match(cHeaders.get('cache-control'), /immutable/)
    assert.doesNotMatch(cHeaders.get('cache-control'), /no-cache/)
    assert.equal(cHeaders.get('content-length'), '113')
    assert.equal(cHeaders.get('content-type'), 'application/vnd.shelter.filechunk+octet-stream')
    assert.equal(cHeaders.get('etag'), `"${chunkCid}"`)
    // Not checking for a `last-modified` header.
    assert.equal(cHeaders.get('x-content-type-options'), 'nosniff')
    assert.equal(cHeaders.get('x-frame-options'), 'deny')
  })
})
