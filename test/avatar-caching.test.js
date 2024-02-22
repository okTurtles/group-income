/* eslint-env mocha */
import '~/shared/domains/chelonia/chelonia.js'

const assert = require('node:assert')
const { readFile } = require('node:fs/promises')

describe('avatar file serving', function () {
  const apiURL = process.env.API_URL
  const manifestCid = 'z9brRu3VKCKeHshQtQfeLjY9j9kMdSbxMtr3nMPgKeGatsDwL2Mn'
  const chunkCid = 'z9brRu3VMBeyzyewfFt4b6HdJhtxxXnC66mKWqJ2bpa3B1FmjuH8'
  let retPath = ''

  before('manually upload a test avatar to the file database', async () => {
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
      body: fd
    }).then(r => r.text())

    assert.equal(retPath, manifestCid)
  })

  it('Should serve our test avatar with correct headers', async function () {
    const { headers } = await fetch(`${apiURL}/file/${retPath}`)

    assert.match(headers.get('cache-control'), /immutable/)
    assert.doesNotMatch(headers.get('cache-control'), /no-cache/)
    assert.equal(headers.get('content-length'), '179')
    assert.equal(headers.get('content-type'), 'application/octet-stream')
    assert.equal(headers.get('etag'), `"${manifestCid}"`)
    // Not checking for a `last-modified` header.
    assert.equal(headers.get('x-frame-options'), 'deny')

    const { headers: cHeaders } = await fetch(`${apiURL}/file/${chunkCid}`)
    assert.match(cHeaders.get('cache-control'), /immutable/)
    assert.doesNotMatch(cHeaders.get('cache-control'), /no-cache/)
    assert.equal(cHeaders.get('content-length'), '468')
    assert.equal(cHeaders.get('content-type'), 'application/octet-stream')
    assert.equal(cHeaders.get('etag'), `"${chunkCid}"`)
    // Not checking for a `last-modified` header.
    assert.equal(cHeaders.get('x-frame-options'), 'deny')
  })
})
