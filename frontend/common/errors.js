'use strict'

import { ChelErrorGenerator } from '@chelonia/lib/errors'

export const GIErrorIgnoreAndBan: typeof Error = ChelErrorGenerator('GIErrorIgnoreAndBan')

// Used to throw human readable errors on UI.
export const GIErrorUIRuntimeError: typeof Error = ChelErrorGenerator('GIErrorUIRuntimeError')

export const GIErrorMissingSigningKeyError: typeof Error = ChelErrorGenerator('GIErrorMissingSigningKeyError')

// Thrown when an identity KV write (unread-messages state) is rejected because
// the local identity contract is still behind the server (the KV value on the
// server was stamped at a height we haven't synced to yet). Chelonia surfaces
// the underlying condition as a plain `Error`, so the shared boundary that
// issues the write rethrows this typed error, letting callers branch on `.name`.
export const GIErrorKVHeightAhead: typeof Error = ChelErrorGenerator('GIErrorKVHeightAhead')
