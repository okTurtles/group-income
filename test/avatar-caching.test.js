/* eslint-env mocha */
import '~/shared/domains/chelonia/chelonia.js'

const assert = require('node:assert')
const { Blob } = require('node:buffer')
const { readFile } = require('node:fs/promises')

describe('avatar file serving', function () {
  const apiURL = process.env.API_URL
  const hash = 'z9brRu3VWZa5jruzt8aaSrmUdHuSSmmuS6ZdR42mygvMGuecuctH'
  let retPath = ''

  before('manually upload a test avatar to the file database', async () => {
    const fd = new FormData()
    fd.append('data', new Blob([await readFile(`./test/data/${hash}`)]))
    fd.append('hash', hash)
    retPath = await fetch(`${apiURL}/file`, {
      method: 'POST',
      body: fd
    }).then(r => r.text())
  })

  it('Should serve our test avatar with correct headers', async function () {
    const { headers } = await fetch(`${apiURL}${retPath}`)

    assert.match(headers.get('cache-control'), /immutable/)
    assert.doesNotMatch(headers.get('cache-control'), /no-cache/)
    assert.equal(headers.get('content-length'), '405')
    assert.equal(headers.get('content-type'), 'application/octet-stream')
    assert.equal(headers.get('etag'), `"${hash}"`)
    // Not checking for a `last-modified` header.
    assert.equal(headers.get('x-frame-options'), 'deny')
  })
})
