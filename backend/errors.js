'use strict'

import { ChelErrorGenerator } from '@chelonia/lib/errors'

export const BackendErrorNotFound: typeof Error = ChelErrorGenerator('BackendErrorNotFound')
export const BackendErrorGone: typeof Error = ChelErrorGenerator('BackendErrorGone')
export const BackendErrorBadData: typeof Error = ChelErrorGenerator('BackendErrorBadData')
