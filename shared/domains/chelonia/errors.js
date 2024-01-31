'use strict'

// ugly boilerplate because JavaScript is stupid
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
export const ChelErrorGenerator = (
  name: string,
  base: typeof Error = Error
): typeof Error =>
  ((class extends base {
    constructor (...params: any[]) {
      super(...params)
      this.name = name // string literal so minifier doesn't overwrite
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor)
      }
    }
  }: any): typeof Error)

export const ChelErrorWarning: typeof Error = ChelErrorGenerator('ChelErrorWarning')
export const ChelErrorDBBadPreviousHEAD: typeof Error = ChelErrorGenerator('ChelErrorDBBadPreviousHEAD')
export const ChelErrorDBConnection: typeof Error = ChelErrorGenerator('ChelErrorDBConnection')
export const ChelErrorUnexpected: typeof Error = ChelErrorGenerator('ChelErrorUnexpected')
export const ChelErrorUnrecoverable: typeof Error = ChelErrorGenerator('ChelErrorUnrecoverable')
export const ChelErrorDecryptionError: typeof Error = ChelErrorGenerator('ChelErrorDecryptionError')
export const ChelErrorDecryptionKeyNotFound: typeof Error = ChelErrorGenerator('ChelErrorDecryptionKeyNotFound', ChelErrorDecryptionError)
export const ChelErrorSignatureError: typeof Error = ChelErrorGenerator('ChelErrorSignatureError')
export const ChelErrorSignatureKeyNotFound: typeof Error = ChelErrorGenerator('ChelErrorSignatureKeyNotFound', ChelErrorSignatureError)
