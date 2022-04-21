'use strict'

export class GIErrorIgnoreAndBanIfGroup extends Error {
  // ugly boilerplate because JavaScript is stupid
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
  constructor (...params: any[]) {
    super(...params)
    this.name = this.constructor.name
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export class GIErrorDropAndReprocess extends Error {
  constructor (...params: any[]) {
    super(...params)
    this.name = this.constructor.name
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

// TODO: delete this and replace with ChelErrorUnrecoverable
export class GIErrorUnrecoverable extends Error {
  constructor (...params: any[]) {
    super(...params)
    this.name = this.constructor.name
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

// Used to throw human readable errors on UI.
export class GIErrorUIRuntimeError extends Error {
  constructor (...params: any[]) {
    super(...params)
    this.name = this.constructor.name
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}
