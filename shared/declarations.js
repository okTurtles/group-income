/* eslint no-undef: "off", no-unused-vars: "off" */
// =======================
// This file prevents flow from bitching about globals and "Required module not found"
// https://github.com/facebook/flow/issues/2092#issuecomment-232917073
//
// Note that the modules can (and should) be properly fixed with flow-typed
// https://github.com/okTurtles/group-income/issues/157
// =======================

// TODO: create a script in scripts/ to run flow via grunt-exec
//       and have it output (at the end of the run) helpful suggestions
//       like how to use `declare module` to ignore .vue requires,
//       and also a strong urging to not overdue the types because
//       FlowType is a little bit stupid and it can turn into a
//       banging-head-on-desk timesink (literally those words).
//       Have the script explain which files represent what.

// Our globals.
declare function logger(err: Error): void
// Nodejs globals.
declare var process: any
// Third-party globals
declare var Compartment: Function

// =======================
// Fix "Required module not found" in a hackish way.
// TODO: Proper fix is to use:
// https://github.com/okTurtles/group-income/issues/157
// =======================
declare module 'blakejs' { declare module.exports: any }
declare module 'buffer' { declare module.exports: any }
declare module 'chalk' { declare module.exports: any }
declare module 'dompurify' { declare module.exports: any }
declare module 'emoji-mart-vue-fast' { declare module.exports: any }
declare module 'emoji-mart-vue-fast/data/apple.json' { declare module.exports: any }
declare module 'form-data' { declare module.exports: any }
declare module 'localforage' { declare module.exports: any }
declare module 'multihashes' { declare module.exports: any }
declare module 'scrypt-async' { declare module.exports: any }
declare module 'tweetnacl' { declare module.exports: any }
declare module 'tweetnacl-util' { declare module.exports: any }
declare module 'vue' { declare module.exports: any }
declare module 'vue-clickaway' { declare module.exports: any }
declare module 'vue-router' { declare module.exports: any }
declare module 'vue-slider-component' { declare module.exports: any }
declare module 'vuelidate' { declare module.exports: any }
declare module 'vuelidate/lib/validators' { declare module.exports: any }
declare module 'vuelidate/lib/validators/maxLength' { declare module.exports: any }
declare module 'vuelidate/lib/validators/required' { declare module.exports: any }
declare module 'vuelidate/lib/validators/sameAs.js' { declare module.exports: any }
declare module 'vuex' { declare module.exports: any }
declare module 'vue2-touch-events' { declare module.exports: any }
declare module 'wicg-inert' { declare module.exports: any }
declare module 'ws' { declare module.exports: any }
declare module '@sbp/sbp' { declare module.exports: any }
declare module '@sbp/okturtles.data' { declare module.exports: any }
declare module '@sbp/okturtles.eventqueue' { declare module.exports: any }
declare module '@sbp/okturtles.events' { declare module.exports: any }
declare module 'favico.js' { declare module.exports: any }

// Only necessary because `AppStyles.vue` imports it from its script tag rather than its style tag.
declare module '@assets/style/main.scss' { declare module.exports: any }
// Other .js files.
declare module '@utils/blockies.js' { declare module.exports: Object }
declare module '~/frontend/controller/utils/misc.js' { declare module.exports: Function }
declare module '~/frontend/model/contracts/misc/flowTyper.js' { declare module.exports: Object }
declare module '~/frontend/model/contracts/shared/time.js' { declare module.exports: Object }
declare module '@model/contracts/shared/time.js' { declare module.exports: Object }
// HACK: declared some shared files below but not sure why it's necessary
declare module '~/shared/domains/chelonia/chelonia.ts' { declare module.exports: any }
declare module '~/shared/domains/chelonia/errors.ts' { declare module.exports: Object }
declare module '~/shared/domains/chelonia/events.ts' { declare module.exports: Object }
declare module '~/shared/domains/chelonia/internals.ts' { declare module.exports: Object }
declare module '~/shared/functions.ts' { declare module.exports: any }
declare module '~/shared/pubsub.ts' { declare module.exports: any }

declare module '~/frontend/model/contracts/shared/giLodash.js' { declare module.exports: any }
declare module '@model/contracts/shared/giLodash.js' { declare module.exports: any }
declare module '@model/contracts/shared/constants.js' { declare module.exports: any }
declare module '@model/contracts/shared/distribution/distribution.js' { declare module.exports: any }
declare module '@model/contracts/shared/voting/rules.js' { declare module.exports: any }
declare module '@model/contracts/shared/voting/proposals.js' { declare module.exports: any }
declare module '@model/contracts/shared/functions.js' { declare module.exports: any }
declare module '@common/common.js' { declare module.exports: any }
declare module './controller/namespace.js' { declare module.exports: any }
declare module './model/contracts/manifests.json' { declare module.exports: any }
declare module './utils/misc.js' { declare module.exports: any }
