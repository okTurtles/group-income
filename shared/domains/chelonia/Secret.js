// @flow

import { serdesDeserializeSymbol, serdesSerializeSymbol, serdesTagSymbol } from '../../serdes/index.js'

/* Wrapper class for secrets, which identifies them as such and prevents them
from being logged */

// Use a `WeakMap` to store the actual secret outside of the returned `Secret`
// object. This ensures that the only way to access the secret is via the
// `.valueOf()` method, and it prevents accidentally logging things that
// shouldn't be logged.
const wm = new WeakMap()
export class Secret<T> {
  // $FlowFixMe[unsupported-syntax]
  static [serdesDeserializeSymbol] (secret) {
    return new this(secret)
  }

  // $FlowFixMe[unsupported-syntax]
  static [serdesSerializeSymbol] (secret: Secret) {
    return wm.get(secret)
  }

  // $FlowFixMe[unsupported-syntax]
  static get [serdesTagSymbol] () {
    return '__chelonia_Secret'
  }

  constructor (value: T) {
    // $FlowFixMe[escaped-generic]
    wm.set(this, value)
  }

  valueOf (): T {
    // $FlowFixMe[escaped-generic]
    // $FlowFixMe[incompatible-return]
    return wm.get(this)
  }
}
