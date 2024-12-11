// @flow

import { serdesDeserializeSymbol, serdesSerializeSymbol, serdesTagSymbol } from '../../serdes/index.js'

/* Wrapper class for secrets, which identifies them as such and prevents them
from being logged */

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
    wm.set(this, value)
  }

  valueOf (): T {
    return wm.get(this)
  }
}
