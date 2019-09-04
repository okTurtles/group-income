'use strict'

export class GIErrorIgnoreAndBanIfGroup extends Error {
  // ugly boilerplate because JavaScript is stupid
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
  constructor (...params) {
    super(...params)
    this.name = this.constructor.name
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}
export class GIErrorDropAndReprocess extends Error {
  constructor (...params) {
    super(...params)
    this.name = this.constructor.name
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export class GIErrorUnrecoverable extends Error {
  constructor (...params) {
    super(...params)
    this.name = this.constructor.name
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}
