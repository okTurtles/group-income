/* eslint-env mocha */
import assert from 'node:assert/strict'
import { blake2b256stream } from '~/shared/blake2bstream.js'
import { blake2b256 } from './multiformats/blake2b.js'

describe('blake2b256stream have the same output as blake2b256', () => {
  it('Using Uint8Array input', async () => {
    const testVectors = [new Uint8Array([0, 1, 2]), new Uint8Array(0), new Uint8Array(1024), new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2, 1])]
    for (const vector of testVectors) {
      const expected = blake2b256.digest(vector)
      const result = await blake2b256stream.digest(vector)
      assert.deepEqual(expected, result)
    }
  })
  it('Using ReadableStream input', async () => {
    const testVectors = [new Uint8Array([0, 1, 2]), new Uint8Array(0), new Uint8Array(1024), new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2, 1])]
    for (const vector of testVectors) {
      const expected = blake2b256.digest(vector)
      const stream = new Blob([vector]).stream()
      const result = await blake2b256stream.digest(stream)
      assert.deepEqual(expected, result)
    }
  })
})
