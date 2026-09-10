'use strict'

import { ChelErrorGenerator } from '@chelonia/lib/errors'

// These three used to carry a `typeof Error` annotation. TypeScript infers the
// constructor type from `ChelErrorGenerator`, so it is no longer needed.
export const GIErrorIgnoreAndBan = ChelErrorGenerator('GIErrorIgnoreAndBan')

// Used to throw human readable errors on UI.
export const GIErrorUIRuntimeError = ChelErrorGenerator('GIErrorUIRuntimeError')

export const GIErrorMissingSigningKeyError = ChelErrorGenerator('GIErrorMissingSigningKeyError')
