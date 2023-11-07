'use strict'

import { ChelErrorGenerator } from '~/shared/domains/chelonia/errors.js'

export const GIErrorIgnoreAndBan: typeof Error = ChelErrorGenerator('GIErrorIgnoreAndBan')

// Used to throw human readable errors on UI.
export const GIErrorUIRuntimeError: typeof Error = ChelErrorGenerator('GIErrorUIRuntimeError')

export const GIErrorMissingSigningKeyError: typeof Error = ChelErrorGenerator('GIErrorMissingSigningKeyError')
