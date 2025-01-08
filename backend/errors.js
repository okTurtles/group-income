'use strict'

import { ChelErrorGenerator } from '~/shared/domains/chelonia/errors.js'

export const BackendErrorNotFound: typeof Error = ChelErrorGenerator('BackendErrorNotFound')
export const BackendErrorGone: typeof Error = ChelErrorGenerator('BackendErrorGone')
export const BackendErrorBadData: typeof Error = ChelErrorGenerator('BackendErrorBadData')
