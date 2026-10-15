'use strict'

import { ChelErrorGenerator } from '@chelonia/lib/errors'

export const GIErrorIgnoreAndBan = ChelErrorGenerator('GIErrorIgnoreAndBan')

// Used to throw human readable errors on UI.
export const GIErrorUIRuntimeError = ChelErrorGenerator('GIErrorUIRuntimeError')

export const GIErrorMissingSigningKeyError = ChelErrorGenerator('GIErrorMissingSigningKeyError')
