'use strict'

export class ChelErrorUnrecoverable extends Error {
  constructor (...params: any[]) {
    super(...params)
    this.name = this.constructor.name
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}
