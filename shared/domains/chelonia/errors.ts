/* eslint-disable @typescript-eslint/no-explicit-any */
export class ChelErrorDBBadPreviousHEAD extends Error {
  // ugly boilerplate because JavaScript is stupid
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
  constructor (...params: any[]) {
    super(...params)
    // this.name = this.constructor.name
    this.name = 'ChelErrorDBBadPreviousHEAD' // string literal so minifier doesn't overwrite
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}
export class ChelErrorDBConnection extends Error {
  constructor (...params: any[]) {
    super(...params)
    this.name = 'ChelErrorDBConnection'
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export class ChelErrorUnexpected extends Error {
  constructor (...params: any[]) {
    super(...params)
    this.name = 'ChelErrorUnexpected'
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export class ChelErrorUnrecoverable extends Error {
  constructor (...params: any[]) {
    super(...params)
    this.name = 'ChelErrorUnrecoverable'
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}
