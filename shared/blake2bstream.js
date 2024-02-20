import blakejs from 'blakejs'
import * as bytes from './multiformats/bytes.js'
import { from } from './multiformats/hasher.js'

const { blake2b, blake2bInit, blake2bUpdate, blake2bFinal } = blakejs

export const blake2b256stream = from({
  name: 'blake2b-256',
  code: 0xb220,
  encode: async (input) => {
    if (input instanceof ReadableStream) {
      const ctx = blake2bInit(32)
      const reader = input.getReader()
      for (;;) {
        const result = await reader.read()
        if (result.done) break
        blake2bUpdate(ctx, bytes.coerce(result.value))
      }
      return blake2bFinal(ctx)
    } else {
      return bytes.coerce(blake2b(input, undefined, 32))
    }
  }
})
