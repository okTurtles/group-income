// @flow

import { serdesDeserializeSymbol, serdesSerializeSymbol, serdesTagSymbol } from '../../serdes/index.js'

/* Wrapper class for secrets, which identifies them as such and prevents them
from being logged */
export class Secret<T> {
  _content: T

  // $FlowFixMe[unsupported-syntax]
  static [serdesDeserializeSymbol] (secret) {
    return new this(secret)
  }

  // $FlowFixMe[unsupported-syntax]
  static [serdesSerializeSymbol] (secret: Secret) {
    return secret._content
  }

  // $FlowFixMe[unsupported-syntax]
  static get [serdesTagSymbol] () {
    return '__chelonia_Secret'
  }

  constructor (value: T) {
    this._content = value
  }

  valueOf (): T {
    return this._content
  }
}
