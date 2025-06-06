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
declare function fetchServerTime(fallback: ?boolean): Promise<string>
declare var logger: Object
// Nodejs globals.
declare var process: any
// Third-party globals
declare var Compartment: Function
declare var crypto: {
    getRandomValues: (buffer: Uint8Array) => Uint8Array,
    subtle: { [k: string]: Function }
}

// =======================
// Fix "Required module not found" in a hackish way.
// TODO: Proper fix is to use:
// https://github.com/okTurtles/group-income/issues/157
// =======================
declare module '@hapi/boom' { declare module.exports: any }
declare module '@hapi/hapi' { declare module.exports: any }
declare module '@hapi/inert' { declare module.exports: any }
declare module '@hapi/joi' { declare module.exports: any }
declare module 'hapi-pino' { declare module.exports: any }
declare module 'pino' { declare module.exports: any }
declare module 'buffer' { declare module.exports: { Buffer: typeof Buffer } }
declare module 'chalk' { declare module.exports: any }
declare module 'dompurify' { declare module.exports: any }
declare module 'emoji-mart-vue-fast' { declare module.exports: any }
declare module 'emoji-mart-vue-fast/data/apple.json' { declare module.exports: any }
declare module 'form-data' { declare module.exports: any }
declare module 'node:fs/promises' { declare module.exports: any }
declare module 'node:path' { declare module.exports: any }
declare module 'node:worker_threads' { declare module.exports: any }
declare module 'node:net' { declare module.exports: any }
declare module 'scrypt-async' { declare module.exports: any }
declare module 'better-sqlite3' { declare module.exports: any }
declare module 'tweetnacl' { declare module.exports: any }
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
declare module 'idle-vue' { declare module.exports: any }
declare module 'vue2-touch-events' { declare module.exports: any }
declare module 'portal-vue' { declare module.exports: any }
declare module 'wicg-inert' { declare module.exports: any }
declare module 'ws' { declare module.exports: any }
declare module '@sbp/sbp' { declare module.exports: any }
declare module '@sbp/okturtles.data' { declare module.exports: any }
declare module '@sbp/okturtles.eventqueue' { declare module.exports: any }
declare module '@sbp/okturtles.events' { declare module.exports: any }
declare module 'favico.js' { declare module.exports: any }
declare module 'lru-cache' { declare module.exports: any }
declare module 'uuid' { declare module.exports: any }
declare module 'marked' { declare module.exports: any }
declare module 'bottleneck' { declare module.exports: any }
declare module '@exact-realty/multipart-parser/encodeMultipartMessage' { declare module.exports: any }
declare module '@apeleghq/rfc8188/decrypt' { declare module.exports: any }
declare module '@apeleghq/rfc8188/encodings' { declare module.exports: any }
declare module '@apeleghq/rfc8188/encrypt' { declare module.exports: any }

declare module '@chelonia/crypto' {
    declare type Key = {
        type: string;
        secretKey?: mixed;
        publicKey?: mixed;
    }
    declare module.exports: any
}
declare module '@chelonia/multiformats/bases/base58' { declare module.exports: any }
declare module '@chelonia/multiformats/blake2b' { declare module.exports: any }
declare module '@chelonia/multiformats/blake2bstream' { declare module.exports: any }
declare module '@chelonia/multiformats/bytes' { declare module.exports: any }
declare module '@chelonia/multiformats/cid' { declare module.exports: any }
declare module '@chelonia/serdes' { declare module.exports: any }
declare module 'turtledash' { declare module.exports: any }

// Only necessary because `AppStyles.vue` imports it from its script tag rather than its style tag.
declare module '@assets/style/main.scss' { declare module.exports: any }
// Other .js files.
declare module '@utils/blockies.js' { declare module.exports: Object }
declare module '~/frontend/model/contracts/misc/flowTyper.js' { declare module.exports: Object }
declare module '~/frontend/model/contracts/shared/time.js' { declare module.exports: Object }
declare module '@model/contracts/shared/time.js' { declare module.exports: Object }
// HACK: declared three files below but not sure why it's necessary
declare module '~/shared/domains/chelonia/events.js' { declare module.exports: Object }
declare module '~/shared/domains/chelonia/errors.js' { declare module.exports: Object }
declare module '~/shared/domains/chelonia/internals.js' { declare module.exports: Object }
declare module '@model/contracts/shared/constants.js' { declare module.exports: any }
declare module '@model/contracts/shared/distribution/distribution.js' { declare module.exports: any }
declare module '@model/contracts/shared/voting/rules.js' { declare module.exports: any }
declare module '@model/contracts/shared/voting/proposals.js' { declare module.exports: any }
declare module '@model/contracts/shared/functions.js' { declare module.exports: any }
declare module '@common/common.js' { declare module.exports: any }
declare module './model/contracts/manifests.json' { declare module.exports: any }
declare module '@model/contracts/shared/payments/index.js' { declare module.exports: any }
declare module './controller/service-worker.js' { declare module.exports: any }
declare module '@controller/instance-keys.js' { declare module.exports: any }
