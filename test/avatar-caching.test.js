/* eslint-env mocha */

const assert = require('assert')
const { copyFile } = require('fs/promises')

const fetch = require('node-fetch')

describe('avatar file serving', function () {
  const apiURL = process.env.API_URL
  const hash = '21XWnNX5exusmJoJNWNNqjhWPqxGURryWbkUhYVsGT5NFtSGKs'

  before('manually upload a test avatar to the file database', async () => {
    await copyFile(`./test/data/${hash}`, `./data/${hash}`)
  })

  it('Should serve our test avatar with correct headers', async function () {
    const { headers } = await fetch(`${apiURL}/file/${hash}`)

    assert.match(headers.get('cache-control'), /immutable/)
    assert.doesNotMatch(headers.get('cache-control'), /no-cache/)
    assert.equal(headers.get('content-length'), '405')
    assert.equal(headers.get('content-type'), 'application/octet-stream')
    assert.equal(headers.get('etag'), `"${hash}"`)
    assert(headers.has('last-modified'))
  })
})
