import { createRequire } from 'node:module'

// const require = createRequire(import.meta.url)
// globalThis.require = require
// eslint-disable-next-line no-global-assign
require = createRequire(import.meta.url)

export {}
