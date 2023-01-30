'use strict'

export class GIErrorIgnoreAndBan extends Error {
  // ugly boilerplate because JavaScript is stupid
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
  constructor (...params /*: any[] */) {
    super(...params)
    this.name = 'GIErrorIgnoreAndBan'
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

// Used to throw human readable errors on UI.
export class GIErrorUIRuntimeError extends Error {
  constructor (...params /*: any[] */) {
    super(...params)
    // this.name = this.constructor.name
    this.name = 'GIErrorUIRuntimeError' // string literal so minifier doesn't overwrite
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}
