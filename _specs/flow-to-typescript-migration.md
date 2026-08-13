# Spec for flow-to-typescript-migration

branch: sebin/task/postkey#6-migrate-to-typescript

## Summary

Group Income currently uses Flow for static typing. Flow is applied globally via `all=true` in `.flowconfig`, so type annotations appear throughout the codebase without needing a `@flow` pragma (only `Gruntfile.js` carries one). Flow types are erased at build time by `flow-remove-types` through a custom esbuild plugin for `.js` files. (It also ran inside the custom Vue SFC plugin for `<script>` blocks until that path was removed — see below.)

This spec covers replacing Flow with TypeScript across the codebase and the toolchain that supports it.

**Measured scope** (files containing Flow syntax, verified by stripping each file with `flow-remove-types` and diffing; excludes `node_modules/`, `dist/`, and the pinned `contracts/` snapshots):

| Area | Files |
|---|---|
| `frontend/views/` (`.vue` SFCs and view utils) | 209 |
| `frontend/model/` | 39 |
| `frontend/controller/` | 21 |
| `frontend/utils/` | 8 |
| `frontend/common/` | 3 |
| `historical/` | 3 |
| Root/other (`Gruntfile.js`, `frontend/setupChelonia.js`, `frontend/declarations.js`, `scripts/refcount-fuzzer.js`, `test/backend.test.js`) | 6 |
| **Total** | **289** |

By extension: **186 `.vue`** and **103 `.js`**.

**Vue SFCs are out of scope for TypeScript.** Their Flow annotations have been stripped outright rather than converted, for two reasons: (A) the annotations carried no real type information — 184 of the 212 Flow lines in `.vue` files were a single `}: Object)` cast, `Object` being Flow's `any`, and only 19 of 1,148 methods (1.7%) had any annotation at all; and (B) meaningful SFC typing requires `defineComponent` inference that Vue 2.6 cannot provide, and a Vue 3 migration is planned as the next piece of work — so typing SFCs now would be thrown away. SFC `<script>` blocks are therefore plain untyped JavaScript, and typing them is deferred to the Vue 3 migration. This is **done** — see [`PROGRESS.md`](../PROGRESS.md) entry 002.

That leaves the **103 `.js` files** as the actual TypeScript migration scope. It is not a mechanical find-and-replace: two areas carry real risk and are called out below — the pinned contract snapshots and the `flowTyper.js` runtime validator library.

## Functional Requirements

### Toolchain replacement

- Introduce a `tsconfig.json` at the project root. It must reproduce the path aliases currently expressed as `module.name_mapper` entries in `.flowconfig` and as aliases in `Gruntfile.js` (`@components`, `@containers`, `@model`, `@pages`, `@utils`, `@views`, `@view-utils`, plus the `@assets`, `@common`, `@controller`, `@svgs` aliases used by the build).
- Replace the `flow-remove-types` esbuild plugin (`scripts/esbuild-plugins/flow-remove-types-plugin.js`) with esbuild's native TypeScript loader. esbuild strips TS types but does **not** typecheck, so typechecking must become its own step.
- Replace the `exec:flow` Grunt task with a `tsc --noEmit` equivalent, and update the `lintTasks` list in `Gruntfile.js` that currently references it.
- ~~Update `scripts/esbuild-plugins/vue-plugin.js` so SFC `<script>` blocks are handled as TypeScript.~~ **Done** — since SFCs are now plain JS, `flowRemoveTypes` was removed from `vue-plugin.js` entirely rather than swapped for a TypeScript path.
- Replace `@babel/preset-flow` with `@babel/preset-typescript` in `.babelrc`. This path is used by `@babel/register` for the Mocha unit tests, so unit tests must keep running unchanged.
- Replace the ESLint Flow tooling — `eslint-plugin-flowtype`, `eslint-plugin-flowtype-errors`, and the `plugin:flowtype/recommended` extends entry in the `eslintConfig` block of `package.json` — with the TypeScript ESLint parser and plugin. Note the project is on ESLint 7.32 with `@babel/eslint-parser`; the chosen `@typescript-eslint` version must be compatible with ESLint 7, or ESLint must be upgraded as part of this work.
- Update the `flow` npm script. (`flow:vue`, which linted SFCs through `eslint-plugin-flowtype-errors`, has already been **deleted** — with SFCs free of Flow it had nothing left to check, and no TypeScript equivalent is needed while they stay untyped.)
- Remove `flow-bin`, `flow-remove-types`, and the Flow-specific ESLint plugins from `package.json` once nothing references them.
- Delete `.flowconfig` once migration is complete.
- CI (`.github/workflows/ci.yml`) runs `grunt ci-test:unit`, which invokes the lint tasks. Typechecking must run in CI in place of Flow.

### Type declaration migration

- Convert `frontend/declarations.js` (Flow libdefs for globals such as `fetchServerTime`, `logger`, `process`, `Compartment`, `crypto`, and `declare module` stubs for `@hapi/*`, `pino`, etc.) into TypeScript ambient declarations (`.d.ts`).
- Replace `frontend/views/utils/vueComponentStub.js.flow` and the `.flowconfig` `module.name_mapper.extension` entries for `svg` and `vue` with TypeScript module declaration shims for `*.vue` and `*.svg` imports.
- `frontend/model/notifications/types.flow.js` is a dedicated Flow types module and should become a TypeScript types module.

### Source migration

- Convert Flow annotations to TypeScript across the 103 `.js` files (the 186 `.vue` files are excluded — their annotations were stripped, see Summary), including the syntax differences that do not map one-to-one: maybe types (`?T` → `T | null | undefined`), exact object types (`{| |}`), variance sigils (`+`/`-`), `mixed` → `unknown`, `Object`/`Function` catch-alls, `$Keys`/`$Values`/`$Shape`/`$Exact` utility types, opaque types, and `import type` / `export type` forms.
- Rename migrated `.js` files to `.ts`, and update the imports that reference them. The ESLint config sets `import/extensions: [2, "ignorePackages"]`, so explicit extensions in import specifiers are enforced and will need updating in step with the renames.
- `.vue` SFCs keep plain `<script>` blocks — **not** `<script lang="ts">`. They are untyped JavaScript until the Vue 3 migration. Templates remain Pug and are out of scope for typechecking either way.

### Areas requiring special handling

- **Pinned contracts.** `contracts/` holds frozen version-pinned snapshots (`gi.contracts_group`, `gi.contracts_chatroom`, `gi.contracts_identity`) produced by `grunt pin:<version>`. Per `docs/src/Calls-From-Contracts.md`, these are frozen in time and must keep behaving identically forever. The migration must not alter the runtime behaviour of any code that gets bundled into a pinned contract, and existing pinned snapshots must not be regenerated or rewritten as part of this work.
- **`flowTyper.js`.** `frontend/model/contracts/misc/flowTyper.js` (460 lines) is a **runtime** validator library, not erased type annotations. It uses Flow generic syntax (e.g. `mapOf<K, V>`, `objectOf<O: TypeValidatorRecord<*>>`) alongside runtime logic that inspects function names (`typeFn.name.includes('optional')`). Converting it risks changing runtime behaviour — particularly anything that depends on function `.name` values surviving compilation. It is bundled into pinned contracts, so behavioural equivalence is mandatory.
- **Vue 2.6 SFCs — resolved, no longer in scope.** Vue 2.6's Options API has weak TypeScript inference compared to Vue 2.7+ or Vue 3, so the 186 SFCs had their Flow stripped rather than converted, and stay untyped until the Vue 3 migration. One consequence is worth carrying forward: the `}: Object)` cast had been hiding the components from `eslint-plugin-vue`, which only recognises a component when `export default` is a bare object expression. Removing it switched those rules on across 182 components and immediately surfaced two latent bugs (a shared array prop default, a computed with no return). Expect more `vue/*` findings as SFCs are touched in future work.
- **`historical/`** and **`ignored/`** are currently excluded by `.flowconfig`. The 3 Flow-syntax files found under `historical/` should be confirmed as in or out of scope rather than silently migrated.

## Possible Edge Cases

- **Silent runtime behaviour change in contracts.** Contract `process` functions must stay deterministic and byte-compatible in effect. A subtle difference introduced by the TypeScript compiler (class field initialisation order, `useDefineForClassFields`, helper injection, function name mangling) could desynchronise state across clients.
- **`flowTyper.js` name-based dispatch.** The `typeFn.name.includes('optional')` checks depend on function names being preserved. TypeScript downlevelling or minification could break this in ways typechecking will not catch.
- **esbuild does not typecheck.** After the switch, a type error no longer fails the build — only the separate `tsc --noEmit` step catches it. If that step is not wired into `grunt dev`, CI, and the lint task list, type errors will ship silently.
- **`import/extensions` rule vs `.ts` renames.** Renaming files while the ESLint rule enforces explicit extensions means imports and filenames must change atomically or lint breaks.
- **`.vue` and `.svg` imports.** These currently resolve through Flow's `module.name_mapper` to a stub. Shims are still required even though SFCs are untyped, because the migrated `.ts` files import them — without `*.vue` / `*.svg` module declarations every such import becomes an unresolved-module error. The shims can stay deliberately loose (`any`-typed default export), since there is no SFC type information to expose.
- **Service worker code.** Chelonia runs in a service worker with its own esbuild entry (`esbuildOptionBags.serviceWorkers`) that uses `defaultPlugins`. Changing the default plugin list affects the service worker bundle as well as the main bundle.
- **Mixed-state period.** While migration is in progress the codebase will contain both `.js` (Flow) and `.ts` files. `allowJs` and the interop between them must be configured so the build is never broken on `master`.
- **Flow's `all=true` masking scope.** Because Flow checked everything implicitly, the true number of files that will produce *new* type errors under TypeScript's stricter checking is likely higher than the 289 files that contain annotations today.
- **ESLint 7 age.** `@typescript-eslint` releases that support ESLint 7 are themselves old; a forced ESLint upgrade would widen the blast radius into the whole lint config, including `standard`, `eslint-plugin-vue` 7, and the Cypress plugin.
- **Cypress and Mocha tests.** `test/` is Flow-ignored today but `test/backend.test.js` contains Flow syntax; test files need a consistent story.

## Acceptance Criteria

- `tsc --noEmit` passes with no errors across the migrated `.js` → `.ts` files. (`.vue` files are excluded from typechecking — they are untyped by decision, not by oversight.)
- No `.flowconfig`, no `flow-bin`, no `flow-remove-types`, and no Flow ESLint plugins remain in the repository or in `package.json`.
- No source file outside `contracts/` and `node_modules/` contains Flow syntax (verifiable by re-running the `flow-remove-types` diff check used to scope this work — it should report zero files).
- `grunt dev` starts, builds, and hot-reloads correctly.
- `NODE_ENV=production grunt build` produces a working production build.
- `grunt test:unit` passes.
- `grunt test:cypress` passes with no new failures relative to the pre-migration baseline.
- `npm run lint` and `npm run stylelint` pass.
- CI (`.github/workflows/ci.yml`) runs a typecheck step in place of `npm run flow` and is green.
- The pinned contract snapshots under `contracts/` are unchanged by this work.
- `flowTyper.js` behaviour is demonstrably unchanged — its runtime validators accept and reject exactly the same inputs as before.
- The app functions correctly end to end: group creation, chat, and the distribution/payments flow all behave as before.

## Open Questions

- **Strictness target.** Should `tsconfig.json` start permissive (`strict: false`, `allowJs: true`, liberal `any`) to get the migration landed, then tighten incrementally? Or should it land strict from the outset, accepting a much larger single change? A permissive start is strongly recommended given the size.
- **Single PR or phased?** With SFCs already handled, the remaining 103 `.js` files across build tooling and contracts are still large for one reviewable change. A phased approach — toolchain first (with `allowJs` so Flow and TS coexist), then leaf modules, then contracts — is safer but requires the build to support both type systems temporarily. Which does the team prefer?
- ~~**Vue SFC typing depth.**~~ **Resolved:** no SFC typing. Flow was stripped from all 186 SFCs and they remain plain JavaScript. Rationale in the Summary — the annotations held no real type information, and Vue 2.6 cannot support meaningful inference anyway.
- ~~**Vue upgrade coupling.**~~ **Resolved:** not bundled here. Vue 3 migration is the next piece of work and will be where SFC typing is revisited; typing them under Vue 2.6 now would be discarded.
- **ESLint upgrade.** Stay on ESLint 7 with an older compatible `@typescript-eslint`, or upgrade ESLint (and `eslint-config-standard`, `eslint-plugin-vue`) as part of this work?
- **`flowTyper.js` fate.** Convert it in place, or treat it as a stable runtime dependency and leave its Flow syntax stripped via a narrowly scoped legacy path? Given it is bundled into frozen contracts, leaving it untouched may be the lower-risk option.
- **`historical/` scope.** Include or exclude? It is Flow-ignored today and appears to be dead reference code.
- **`@chelonia/*` packages.** These are external dependencies (`@chelonia/lib`, `@chelonia/cli`, `@chelonia/crypto`, `@chelonia/serdes`, `@chelonia/multiformats`). Do they ship TypeScript declarations? If not, ambient stubs will be needed, and the quality of contract-layer typing will be limited by their absence.
- **Contract re-pinning.** Does migrating contract source require a new pinned version under `contracts/`, or can the existing pins remain untouched because they are already-compiled frozen output?

## Testing Guidelines

Create test file(s) in the `./test` folder for this migration, and create meaningful tests for the following cases, without going too heavy:

- **`flowTyper.js` behavioural equivalence** — the highest-value test. Cover each exported validator (`arrayOf`, `objectOf`, `objectMaybeOf`, `mapOf`, `literalOf`, `maybe`, `optional`, `object`, `mixed`, and the `isX` primitives) with both accepting and rejecting inputs, and assert that `TypeValidatorError` messages and scopes are unchanged. Write these tests **before** migrating the file so they run green against the Flow version first and serve as a genuine regression harness.
- **Contract validate/process determinism** — for `group.js`, `chatroom.js`, and `identity.js`, assert that a fixed sequence of actions produces identical resulting state before and after migration.
- **Build output integrity** — a check that the production build emits the expected bundles and that no Flow-stripping plugin remains in the esbuild plugin chain.
- **No residual Flow syntax** — a repo-wide assertion that stripping Flow types from any non-`contracts/` source file is a no-op, so the migration cannot silently regress.
- **Path alias resolution** — confirm each alias declared in `tsconfig.json` resolves to the same target as the corresponding `Gruntfile.js` alias, so the typechecker and bundler cannot drift apart.

Beyond new tests, the existing suites are the primary safety net: `grunt test:unit` and the full Cypress suite (`grunt test:cypress`) must both be green, with a baseline captured before migration begins so new failures are distinguishable from pre-existing ones.
