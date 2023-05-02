'use strict'

import multihash from 'multihashes'
import blake from 'blakejs'

if (typeof window === 'object' && typeof Buffer === 'undefined') {
  const { Buffer } = require('buffer')
  window.Buffer = Buffer
}

export function blake32Hash (data) {
  const unit8array = blake.blake2b(data, null, 32)
  const buf = Buffer.from(unit8array.buffer)
  return multihash.toB58String(multihash.encode(buf, 'blake2b-32', 32))
}
