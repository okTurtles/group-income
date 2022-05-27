'use strict'

// TODO: go through project imports and replace everything with /assets/js/common.js
// NOTE: potentially useful issue for dealing with "import sbp" in contracts:
//       https://github.com/evanw/esbuild/issues/1616
// PLAN: when a new contract version is encountered, unregister the selectors that
//       were previously registered, and re-register the new ones.
// TODO: use esbuild plugin with onResolve to build up a list of modules that are
//       imported using 'common.js'. Then check the main bundle against this list.
//       if there are any repeated imports, throw an exception, so that we don't
//       double-import stuff. Another possibility is reorganizing and moving
//       all of the files below under a 'common' folder. This will more than likely
//       catch all instances of duplicates and prevent new ones from being introduced.
//       There's really two folders that need to be placed under it:
//       frontend/common/utils and frontend/common/model
// TODO: if sbp is loaded in SES compartment as an injected global, then you'll probably need to
//       once again search-replace the project to move sbp from the common import
//       to just the main bundle

// TODO: enable live reloading based on changes to this file or any of its imports

// This file exists so that it can serve as a bridge between runtime-loaded
// contracts and the rest of the app. It also prevents code duplication.
// Basically, if you want to import something in a contract, import it
// here instead, and then within your contract definition, import whatever
// it was from this file (instead of doing a direct import).

// IMPORTANT: the logic within this file that affects the state of contracts must never change.
//            If you need to modify logic, you'll have to create
//            new files/functions/constants with different names.

// import SBP stuff before anything else so that domains register themselves before called
import sbp from '@sbp/sbp'
import '@sbp/okturtles.data'
import '@sbp/okturtles.events'
import '@sbp/okturtles.eventqueue'
export { sbp }
export { default as Vue } from 'vue'
// export { default as nacl } from 'nacl' // TODO: double-check if this is really needed here
export * from '~/shared/domains/chelonia/chelonia.js'
export * from '~/shared/domains/chelonia/events.js'
export * from '~/shared/domains/chelonia/errors.js'
export * from '~/shared/functions.js'
export * from './utils/flowTyper.js'
export * as _ from './utils/giLodash.js'
export * from './utils/giLodash.js'
export * from './utils/time.js'
export * from './utils/events.js'
export * from './views/utils/misc.js'
export * from './views/utils/currencies.js'
export { default as currencies } from './views/utils/currencies.js'
export * from './views/utils/translations.js'
export { default as L } from './views/utils/translations.js'
export * from './model/errors.js'
export * as Errors from './model/errors.js'
export * from './model/contracts/shared/types.js'
export * from './model/contracts/shared/functions.js'
export * from './model/contracts/shared/constants.js'
export * from './model/contracts/distribution/distribution.js'
export { default as mincomeProportional } from './model/contracts/distribution/mincome-proportional.js'
export * from './model/contracts/payments/index.js'
export * from './model/contracts/voting/constants.js'
export * from './model/contracts/voting/rules.js'
export { default as votingRules } from './model/contracts/voting/rules.js'
export * from './model/contracts/voting/proposals.js'
export { default as proposals } from './model/contracts/voting/proposals.js'
