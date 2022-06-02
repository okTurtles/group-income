'use strict'

// This file is used by common.js and therefore all contracts as well
// It prevents multiple sbps from existing by mapping imports of '@sbp/sbp'
// to this file, and therefore to a global variable containing the real sbp.
//
// See main-sbp.js for details.

// $FlowFixMe
const sbp: Function = (typeof globalThis !== 'undefined' && globalThis.sbp) ||
  (typeof window !== 'undefined' && window.sbp) ||
  (typeof global !== 'undefined' && global.sbp)

export default sbp
