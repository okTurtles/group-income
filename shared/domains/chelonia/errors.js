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
      // Polyfill for cause property
      // $FlowFixMe[prop-missing]
      if (params[1]?.cause !== this.cause) {
        // $FlowFixMe[prop-missing]
        Object.defineProperty(this, 'cause', { configurable: true, writable: true, value: params[1]?.cause })
      }
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor)
      }
    }
  }: any): typeof Error)

export const ChelErrorWarning: typeof Error = ChelErrorGenerator('ChelErrorWarning')
export const ChelErrorAlreadyProcessed: typeof Error = ChelErrorGenerator('ChelErrorAlreadyProcessed')
export const ChelErrorDBBadPreviousHEAD: typeof Error = ChelErrorGenerator('ChelErrorDBBadPreviousHEAD')
export const ChelErrorDBConnection: typeof Error = ChelErrorGenerator('ChelErrorDBConnection')
export const ChelErrorUnexpected: typeof Error = ChelErrorGenerator('ChelErrorUnexpected')
export const ChelErrorKeyAlreadyExists: typeof Error = ChelErrorGenerator('ChelErrorKeyAlreadyExists')
export const ChelErrorUnrecoverable: typeof Error = ChelErrorGenerator('ChelErrorUnrecoverable')
export const ChelErrorForkedChain: typeof Error = ChelErrorGenerator('ChelErrorForkedChain')
export const ChelErrorDecryptionError: typeof Error = ChelErrorGenerator('ChelErrorDecryptionError')
export const ChelErrorDecryptionKeyNotFound: typeof Error = ChelErrorGenerator('ChelErrorDecryptionKeyNotFound', ChelErrorDecryptionError)
export const ChelErrorSignatureError: typeof Error = ChelErrorGenerator('ChelErrorSignatureError')
export const ChelErrorSignatureKeyUnauthorized: typeof Error = ChelErrorGenerator('ChelErrorSignatureKeyUnauthorized', ChelErrorSignatureError)
export const ChelErrorSignatureKeyNotFound: typeof Error = ChelErrorGenerator('ChelErrorSignatureKeyNotFound', ChelErrorSignatureError)
export const ChelErrorFetchServerTimeFailed: typeof Error = ChelErrorGenerator('ChelErrorFetchServerTimeFailed')
export const ChelErrorUnexpectedHttpResponseCode: typeof Error = ChelErrorGenerator('ChelErrorUnexpectedHttpResponseCode')
export const ChelErrorResourceGone: typeof Error = ChelErrorGenerator('ChelErrorResourceGone', ChelErrorUnexpectedHttpResponseCode)
