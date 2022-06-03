'use strict'

// This file works in conjunction with common-sbp.js.
// There are several tricks going on here:
//
// 1. This file is its own entrypoint. This is done purposefully
//    so that it can be included directly from frontend/index.html
//    before any other javascript.
//    We do this because simply importing it from main.js as the first
//    import does not ensure that its code is run before anything else.
//    Blame esbuild for this.
// 2. This file makes sbp globally accessible. This is done to ensure
//    that there is a single SBP function in the entire app, as this
//    helps ensure interoperability with common.js, which is loaded
//    by slim'd down contracts.
// 3. common.js "imports @sbp/sbp" as well, but that is aliased to
//    point to common-sbp.js, which in turn retrieves the sbp function
//    from a global variable.
//
// It is thus safe to call "import '@sbp/sbp'" from anywhere - in the
// contracts or within the main app, and they will all point to the
// same sbp function, with the same selectors registered.

// NOTE: potentially useful issue for dealing with "import sbp" in contracts:
//       https://github.com/evanw/esbuild/issues/1616

import sbp from '@sbp/sbp'

window.sbp = sbp

export default sbp
