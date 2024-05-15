// @flow

import { serdesDeserializeSymbol, serdesSerializeSymbol, serdesTagSymbol } from '../../serdes/index.js'

/* Wrapper class for secrets, which identifies them as such and prevents them
from being logged */
export class Secret<T> {
  _content: T

  static [serdesDeserializeSymbol] (secret) {
    return new this(secret)
  }

  static [serdesSerializeSymbol] (secret: Secret) {
    return secret._content
  }

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
