/* globals Deno */
/* eslint require-await: "off" */
import {
  assert,
  assertEquals,
  assertMatch,
  assertNotMatch
} from 'https://deno.land/std@0.153.0/testing/asserts.ts'

import '~/scripts/process-shim.ts'

Deno.test({
  name: 'Avatar file serving',
  fn: async function (tests) {
    const apiURL = process.env.API_URL ?? 'http://localhost:8000'
    const hash = '21XWnNX5exusmJoJNWNNqjhWPqxGURryWbkUhYVsGT5NFtSGKs'

    // Manually upload a test avatar to the file database.
    await Deno.copyFile(`./test/data/${hash}`, `./data/${hash}`)

    await tests.step('Should serve our test avatar with correct headers', async function () {
      const { headers } = await fetch(`${apiURL}/file/${hash}`)

      assertMatch(headers.get('cache-control'), /immutable/)
      assertNotMatch(headers.get('cache-control'), /no-cache/)
      assertEquals(headers.get('content-length'), '405')
      assertEquals(headers.get('content-type'), 'application/octet-stream')
      assertEquals(headers.get('etag'), `"${hash}"`)
      assert(headers.has('last-modified'))
      assertEquals(headers.get('x-frame-options'), 'deny')
    })
  },
  sanitizeResources: false,
  sanitizeOps: false
})
