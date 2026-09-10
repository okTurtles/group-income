// Ambient globals for the TypeScript build.
//
// This is the counterpart of Flow's `[libs]` entry in `.flowconfig`, which
// points at `frontend/declarations.js`. Both are live during the migration:
// Flow reads the `.js`, TypeScript reads this file. The `.js` goes away in
// Step 9 with the rest of Flow.
//
// Keep this file free of top-level `import` / `export` statements — either one
// turns it into a module and every declaration below stops being global.

// =============================================================================
// Why this file is 300 lines shorter than `frontend/declarations.js`
// =============================================================================
//
// `frontend/declarations.js` carries 88 `declare module 'x' { declare
// module.exports: any }` stubs whose only job was to silence Flow's "Required
// module not found". None of them are carried over, for three different
// reasons.
//
// **73 are package stubs, and TypeScript resolves those on its own.** Verified
// rather than assumed: all 42 bare specifiers imported anywhere under
// `frontend/` (test files excluded) were imported from a throwaway `.ts` file
// and typechecked — zero resolution errors. Restoring the stubs would actively
// hurt, because an ambient `declare module` *outranks* a package's real
// declarations: stubbing `vue`, `vuex`, `vue-router`, `marked`, `turtledash`,
// `@sbp/*` or `@chelonia/*` would throw away exactly the type information
// Steps 4-8 are meant to be checked against. Same reasoning as the
// `@chelonia/*` decision in the plan. Untyped packages (`dompurify`,
// `vuelidate`, `scrypt-async`, `emoji-mart-vue-fast`, …) degrade to `any` by
// themselves under `strict: false`, which is what Flow gave them too.
//
// **32 of those 73 are dead outright** — `@hapi/*`, `hapi-pino`, `pino`,
// `chalk`, `form-data`, `ws`, `better-sqlite3`, `node:*`, `favico.js`,
// `lru-cache`, `uuid`, `bottleneck`, `vue-slider-component`,
// `@apeleghq/rfc8188/*`, `@chelonia/multiformats/*`, `@chelonia/lib/db`,
// `@chelonia/lib/presets`, `@chelonia/lib/zkppConstants`,
// `vuelidate/lib/validators/maxLength`. Those specifiers appear nowhere in the
// repo except `declarations.js` itself; most are leftovers from when the
// backend lived here, before it became `chel serve`. Several aren't installed.
//
// **The remaining 15 are local-path stubs** (`@utils/blockies.js`,
// `~/frontend/model/contracts/misc/flowTyper.js`, `@common/common.js`,
// `@model/contracts/shared/*.js`, `./controller/service-worker.js`, …) and
// cannot be reproduced in TypeScript even if we wanted them: `paths` resolution
// wins over an ambient `declare module` with the same specifier, so TypeScript
// opens the real file regardless. Confirmed by probe — declaring
// `'~/frontend/model/contracts/misc/flowTyper.js'` as `any` left all 387 parse
// errors from that file's Flow syntax in place. The mechanism that keeps those
// files out of the program is the leaf-first conversion order, not a stub.

// =============================================================================
// Our globals
// =============================================================================

// Injected into the contract sandbox by Chelonia; called from `group.js` and
// `chatroom.js`, both of which carry a `/* globals fetchServerTime */` comment.
//
// Mirrors the Flow libdef exactly: `fallback: ?boolean` is `boolean | null |
// void`, and the `?` on the parameter supplies the `void` half. Per RULES 2 in
// TYPESCRIPT-MIGRATION-PLAN.md — mirror Flow, do not fix it.
//
// The fix, for whoever tightens this later: `| null` is wrong. The
// implementation (`@chelonia/lib/dist/esm/internals.mjs:367`) is
// `async (fallback = true)`, a default parameter, and defaults fire only on
// `undefined`. Passing `null` is therefore not "unspecified" — it is falsy, so
// it skips the local-clock fallback and throws
// `ChelErrorFetchServerTimeFailed`. The accurate signature is
// `(fallback?: boolean)`. Inert either way today: both call sites pass no
// argument, and `strictNullChecks` is off.
declare function fetchServerTime (fallback?: boolean | null): Promise<string>

// =============================================================================
// Node globals
// =============================================================================

// Deliberately left `any`, exactly as `frontend/declarations.js` had it.
//
// Scope parity governs this migration: TypeScript checks what Flow checked, and no more.
declare var process: any

// =============================================================================
// Deliberately NOT declared
// =============================================================================
//
//   crypto       `lib.dom.d.ts` already declares it as `Crypto`, which is
//                strictly better than the Flow shape (`getRandomValues` +
//                `subtle`) and covers all 11 frontend uses. Redeclaring it
//                would collide.
//
//   logger       Dead. `declare var logger: Object` in the Flow libdef has no
//                global consumer left: every `logger` in `frontend/` is a local
//                binding (`model/logger.js`, `model/captureLogs.js`,
//                `model/swCaptureLogs.js`).
//
//   Compartment  Dead. Zero references under `frontend/`. It belongs to the
//                SES sandbox that now lives inside Chelonia.
//
// If any of these turns out to be needed once Steps 4-8 start converting real
// files, add it back here with the file that needed it named in a comment.
