# Spec for flow-to-typescript-migration

branch: sebin/task/postkey#6-migrate-to-typescript

## Summary

Group Income currently uses Flow for static typing. Flow is applied globally via `all=true` in `.flowconfig`, so type annotations appear throughout the codebase without needing a `@flow` pragma — **no file in the repo carries one**, and `flow-remove-types` is correspondingly configured with `all: true` (see the comment at `Gruntfile.js:216`). Flow types are erased at build time by `flow-remove-types` through a custom esbuild plugin for `.js` files. (It also ran inside the custom Vue SFC plugin for `<script>` blocks until that path was removed — see below.)

Coverage is global *minus* the `[ignore]` block of `.flowconfig`, which is substantial and must be carried over verbatim — see the parity principle below.

This spec covers replacing Flow with TypeScript across the codebase and the toolchain that supports it.

**Measured scope** (files containing Flow syntax, verified by stripping each file with `flow-remove-types` and diffing; excludes `node_modules/`, `dist/`, and the pinned `contracts/` snapshots):

| Area | Files |
|---|---|
| `frontend/views/` (`.vue` SFCs and view utils) | 209 |
| `frontend/model/` | 39 |
| `frontend/controller/` | 21 |
| `frontend/utils/` | 8 |
| `frontend/common/` | 3 |
| Root/other (`frontend/setupChelonia.js`, `frontend/declarations.js`, plus the Flow-**ignored** `Gruntfile.js`, `scripts/refcount-fuzzer.js`, `test/backend.test.js`) | 6 |
| **Total** | **286** |

By extension: **184 `.vue`** and **102 `.js`**.

**`historical/` is excluded from every count in this spec.** It is Flow-ignored, dead reference code, and unreachable from any esbuild entry point, so it is not migration scope in any sense — not converted, not stripped, not counted. It holds 8 files with Flow syntax (6 `.js`, 2 `.vue`) and they stay exactly as they are, Flow syntax intact. Wherever this document gives a file count, `historical/` has already been subtracted.

**Vue SFCs are out of scope for TypeScript.** Their Flow annotations have been stripped outright rather than converted, for two reasons: (A) the annotations carried no real type information — 184 of the 212 Flow lines in `.vue` files were a single `}: Object)` cast, `Object` being Flow's `any`, and only 19 of 1,148 methods (1.7%) had any annotation at all; and (B) meaningful SFC typing requires `defineComponent` inference that Vue 2.6 cannot provide, and a Vue 3 migration is planned as the next piece of work — so typing SFCs now would be thrown away. SFC `<script>` blocks are therefore plain untyped JavaScript, and typing them is deferred to the Vue 3 migration. This is **done** — see [`PROGRESS.md`](../PROGRESS.md) entry 002.

That leaves the `.js` files as the actual TypeScript migration scope. Re-measuring after the SFC work (full repo sweep, `flow-remove-types` with `all: true`) finds 111 `.js` files with Flow syntax; **6 of those are in `historical/` and are dropped from scope**, leaving **105**. (The earlier figure of 103 undercounted the test files.) Those 105 split by whether Flow actually checks them:

| | Files | Migration treatment |
|---|---|---|
| Flow-**checked** | 99 | Convert to TypeScript. |
| Flow-**ignored** but still built | 6 | Strip Flow syntax so the file still parses. **No type coverage added** — see the parity principle below. |
| Flow-**ignored** and not built (`historical/`) | 6 | **Nothing.** Out of scope; excluded from the 105. |

The 6 Flow-ignored-but-built files: `Gruntfile.js`, `frontend/controller/service-worker.js`, `frontend/model/contracts/misc/flowTyper.js`, `frontend/model/contracts/shared/distribution/distribution.test.js`, `scripts/refcount-fuzzer.js`, `test/backend.test.js`. These need stripping only because esbuild or Babel still parses them — that is the sole reason any Flow-ignored file gets touched, and it is exactly why `historical/` does not.

This is not a mechanical find-and-replace: two areas carry real risk and are called out below — the contract source that feeds pinned snapshots, and the `flowTyper.js` runtime validator library.

## Functional Requirements

### Scope parity with Flow — the governing principle

**This migration swaps type systems. It does not expand type coverage.** TypeScript must check exactly what Flow checked, no more and no less. Every path in the `[ignore]` block of `.flowconfig` must have a matching entry in `tsconfig.json`'s `exclude` (and in `eslintIgnore`, where it already does). If a file is untypechecked today, it stays untypechecked after the migration — widening coverage is separate, later work, and pulling it in here would flood the change with unrelated errors and make the diff unreviewable.

#### The complete ignore list

`.flowconfig` `[ignore]` holds 22 entries. Six of them are **stale** — they name paths that no longer exist (`shared/` and `backend/` are gone from the repo entirely) — and two more are redundant with a broader pattern. Those should be dropped rather than transcribed, so `tsconfig.json` starts clean:

| `.flowconfig` `[ignore]` entry | Carry over? | `tsconfig.json` `exclude` |
|---|---|---|
| `.*/node_modules/.*` | ✅ | `node_modules` |
| `.*/dist/.*` | ✅ | `dist` |
| `.*/dist-dashboard/.*` | ✅ | `dist-dashboard` |
| `<PROJECT_ROOT>/contracts/.*` | ✅ | `contracts` |
| `.*/Gruntfile.js` | ✅ | `Gruntfile.js` |
| `.*/cypress.config.js` | ✅ | `cypress.config.js` |
| `.*/scripts/.*` | ✅ | `scripts` |
| `.*/test/.*` | ✅ | `test` |
| `.*.test.js` | ✅ | `**/*.test.js` |
| `.*/historical/.*` | ✅ | `historical` |
| `.*/frontend/assets/.*` | ✅ | `frontend/assets` |
| `.*/frontend/controller/service-worker.js` | ✅ | `frontend/controller/service-worker.js` |
| `.*/frontend/utils/blockies.js` | ✅ | `frontend/utils/blockies.js` |
| `.*/frontend/model/contracts/misc/flowTyper.js` | ✅ | `frontend/model/contracts/misc/flowTyper.js` |
| `.*/Gruntfile.dashboard.js` | ❌ stale | — file does not exist |
| `.*/backend/dashboard/.*` | ❌ stale | — `backend/` does not exist |
| `.*/shared/multiformats/.*` | ❌ stale | — `shared/` does not exist |
| `.*/shared/blake2bstream.js` | ❌ stale | — `shared/` does not exist |
| `.*/frontend/utils/vuexQueue.js` | ❌ stale | — file does not exist |
| `.*/ignored/.*` | ❌ stale | — directory does not exist |
| `.*/test/backend.js` | ❌ redundant | covered by `test` |
| `.*/test/frontend.js` | ❌ redundant | covered by `test` |

Dropping a stale entry changes nothing about what gets checked, so it does not violate parity — but each omission should be justified in the PR description so a reviewer can tell a deliberate cleanup from an accidental widening.

Separately, `package.json` `eslintIgnore` is *not* identical to the Flow list — it additionally ignores `test/cypress/cache/*` and `shared/types.js` (also stale), and unlike Flow it does not ignore `Gruntfile.js`, `cypress.config.js`, or `scripts/`. Bringing those two lists into agreement is out of scope here; just don't assume one mirrors the other.

#### Three consequences worth stating explicitly

- **Ignored ≠ untouched by the build.** Flow's `[ignore]` only suppresses *typechecking*; esbuild and Babel still parse most of these files. Six Flow-ignored `.js` files that *are* built nevertheless contain Flow syntax (listed in the Summary). Once `flow-remove-types` is gone from the esbuild plugin chain, that syntax no longer parses — so it must still be dealt with, just by **stripping it**, never by adding type coverage the file never had. The converse also holds: a Flow-ignored file that nothing builds needs no work at all, which is precisely the case for `historical/`.
- **Ignored ≠ unedited.** Several ignored files are build *configuration* and must change as part of the toolchain swap — `Gruntfile.js` most of all (it defines the esbuild plugin chain, the `exec:flow` task, and the `lintTasks` list). Editing them as configuration is expected and required; what parity forbids is *typechecking* them. `Gruntfile.js` is the file where this distinction matters most, so to be unambiguous: **it is heavily edited and never typechecked.**
- **No new `@ts-*` debt in excluded files.** An excluded file needs no `@ts-nocheck`, no `any` annotations, no declaration work. If a change to one of these files feels necessary beyond removing Flow syntax or updating build config, that is a signal the exclusion has been dropped by mistake.

### Toolchain replacement

*(`Gruntfile.js` and `scripts/` are Flow-ignored and stay TypeScript-excluded. Everything below is build-**configuration** work on them, not type migration — see "Ignored ≠ unedited" above.)*

- Introduce a `tsconfig.json` at the project root. It must reproduce two things from `.flowconfig`: the path aliases currently expressed as `module.name_mapper` entries (and as aliases in `Gruntfile.js` — `@components`, `@containers`, `@model`, `@pages`, `@utils`, `@views`, `@view-utils`, plus `@assets`, `@common`, `@controller`, `@svgs`), and the `[ignore]` block as `exclude`, per the table above.
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

- Convert Flow annotations to TypeScript across the **99 Flow-checked** `.js` files (the 6 Flow-ignored-but-built ones get their syntax stripped only; `historical/` is untouched; the 184 `.vue` files are already done — see Summary), including the syntax differences that do not map one-to-one: maybe types (`?T` → `T | null | undefined`), exact object types (`{| |}`), variance sigils (`+`/`-`), `mixed` → `unknown`, `Object`/`Function` catch-alls, `$Keys`/`$Values`/`$Shape`/`$Exact` utility types, opaque types, and `import type` / `export type` forms.
- Rename migrated `.js` files to `.ts`, and update the imports that reference them. The ESLint config sets `import/extensions: [2, "ignorePackages"]`, so explicit extensions in import specifiers are enforced and will need updating in step with the renames.
- `.vue` SFCs keep plain `<script>` blocks — **not** `<script lang="ts">`. They are untyped JavaScript until the Vue 3 migration. Templates remain Pug and are out of scope for typechecking either way.

### Areas requiring special handling

- **Contract source, not the pinned snapshots.** The `contracts/` folder (45 tracked files across `gi.contracts_group`, `gi.contracts_chatroom`, `gi.contracts_identity`) is *generated* build output from `grunt pin:<version>`, and is already excluded from both toolchains — `.flowconfig` ignores `<PROJECT_ROOT>/contracts/.*` and `package.json` `eslintIgnore` lists `contracts/*`. It needs no migration and no special typechecker work beyond mirroring that one ignore as an `exclude` entry in `tsconfig.json`. The only rule is procedural: **do not regenerate or rewrite existing pins** as part of this migration.
  What does need care is the contract **source** under `frontend/model/contracts/` (`group.js`, `chatroom.js`, `identity.js`, plus `shared/` and `misc/`) — that *is* typechecked, *is* being migrated, and is what future `grunt pin` runs will bundle. Per `docs/src/Calls-From-Contracts.md`, anything reachable from a contract is frozen in time once pinned, so the migration must not alter its runtime behaviour.
- **`flowTyper.js`.** `frontend/model/contracts/misc/flowTyper.js` (460 lines) is a **runtime** validator library, not erased type annotations. It uses Flow generic syntax (e.g. `mapOf<K, V>`, `objectOf<O: TypeValidatorRecord<*>>`) alongside runtime logic that inspects function names (`typeFn.name.includes('optional')`). Converting it risks changing runtime behaviour — particularly anything that depends on function `.name` values surviving compilation. It is bundled into pinned contracts, so behavioural equivalence is mandatory.
  Note it is **already Flow-ignored** (`.flowconfig`) and ESLint-ignored (`eslintIgnore`), so under the parity principle it must be `tsconfig` `exclude`d too — it is not to be typechecked, and no attempt should be made to express its generics as real TypeScript types. It is live source that esbuild parses, though, so its Flow *syntax* still has to go. That makes it a syntax-stripping job with a behavioural-equivalence test harness, not a typing job — the smallest possible change, not the most correct one.
- **Vue 2.6 SFCs — resolved, no longer in scope.** Vue 2.6's Options API has weak TypeScript inference compared to Vue 2.7+ or Vue 3, so the 186 SFCs had their Flow stripped rather than converted, and stay untyped until the Vue 3 migration. One consequence is worth carrying forward: the `}: Object)` cast had been hiding the components from `eslint-plugin-vue`, which only recognises a component when `export default` is a bare object expression. Removing it switched those rules on across 182 components and immediately surfaced two latent bugs (a shared array prop default, a computed with no return). Expect more `vue/*` findings as SFCs are touched in future work.
- **`historical/` — out of scope entirely. Do not touch it.** It is Flow-ignored, so it is TypeScript-excluded; it is dead reference code unreachable from any esbuild entry point, so nothing parses it and its Flow syntax breaks nothing. Its 8 files with Flow syntax (6 `.js`, 2 `.vue`) are **left exactly as they are, Flow syntax and all**, and are excluded from every file count in this spec. This is the one place where "Flow-ignored" additionally means "unedited". (`ignored/` gets the same treatment in principle, but the directory no longer exists.)

## Possible Edge Cases

- **Silent runtime behaviour change in contracts.** Contract `process` functions must stay deterministic and byte-compatible in effect. A subtle difference introduced by the TypeScript compiler (class field initialisation order, `useDefineForClassFields`, helper injection, function name mangling) could desynchronise state across clients.
- **`flowTyper.js` name-based dispatch.** The `typeFn.name.includes('optional')` checks depend on function names being preserved. TypeScript downlevelling or minification could break this in ways typechecking will not catch.
- **esbuild does not typecheck.** After the switch, a type error no longer fails the build — only the separate `tsc --noEmit` step catches it. If that step is not wired into `grunt dev`, CI, and the lint task list, type errors will ship silently.
- **`import/extensions` rule vs `.ts` renames.** Renaming files while the ESLint rule enforces explicit extensions means imports and filenames must change atomically or lint breaks.
- **`.vue` and `.svg` imports.** These currently resolve through Flow's `module.name_mapper` to a stub. Shims are still required even though SFCs are untyped, because the migrated `.ts` files import them — without `*.vue` / `*.svg` module declarations every such import becomes an unresolved-module error. The shims can stay deliberately loose (`any`-typed default export), since there is no SFC type information to expose.
- **Service worker code.** Chelonia runs in a service worker with its own esbuild entry (`esbuildOptionBags.serviceWorkers`) that uses `defaultPlugins`. Changing the default plugin list affects the service worker bundle as well as the main bundle.
- **Mixed-state period.** While migration is in progress the codebase will contain both `.js` (Flow) and `.ts` files. `allowJs` and the interop between them must be configured so the build is never broken on `master`.
- **Flow's `all=true` masking scope.** Because Flow checked everything implicitly (minus the `[ignore]` list), the number of files that will produce *new* type errors under TypeScript's stricter checking is likely higher than the count of files that contain annotations today. Where that happens the fix is to relax `tsconfig` strictness, not to silently widen or narrow which files are checked — parity with Flow's ignore list is the fixed constraint; strictness is the dial.
- **ESLint 7 age.** `@typescript-eslint` releases that support ESLint 7 are themselves old; a forced ESLint upgrade would widen the blast radius into the whole lint config, including `standard`, `eslint-plugin-vue` 7, and the Cypress plugin.
- **Cypress and Mocha tests.** `test/` and `*.test.js` are Flow-ignored today, yet `test/backend.test.js` and `frontend/model/contracts/shared/distribution/distribution.test.js` contain Flow syntax. Under parity they stay untypechecked, but they still run through `@babel/register`, so their Flow syntax has to be stripped for the tests to keep executing once `@babel/preset-flow` is removed.

## Acceptance Criteria

- `tsc --noEmit` passes with no errors across the migrated `.js` → `.ts` files. (`.vue` files are excluded from typechecking — they are untyped by decision, not by oversight.)
- **Scope parity holds:** every live path in the `.flowconfig` `[ignore]` block has a corresponding `exclude` entry in `tsconfig.json`, and no file that Flow ignored is being typechecked by TypeScript. Reviewable by diffing the two lists side by side against the table above; the only permitted omissions are the 6 stale and 2 redundant entries, each justified in the PR description.
- **`Gruntfile.js` is excluded from `tsc` yet updated as build config** — both facts hold simultaneously, and neither is an oversight.
- No `.flowconfig`, no `flow-bin`, no `flow-remove-types`, and no Flow ESLint plugins remain in the repository or in `package.json`.
- No source file outside `node_modules/`, `dist/`, `contracts/`, and `historical/` contains Flow syntax (verifiable by re-running the `flow-remove-types` diff check used to scope this work). `historical/` is exempt because it is dead, Flow-ignored, and never built.
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

- **Strictness target.** Should `tsconfig.json` start permissive (`strict: false`, `allowJs: true`, liberal `any`) to get the migration landed, then tighten incrementally? Or should it land strict from the outset, accepting a much larger single change?: A permissive start is strongly recommended given the size. Yes, start permissive.

- **Single PR or phased?** With SFCs already handled, the remaining 103 `.js` files across build tooling and contracts are still large for one reviewable change. A phased approach — toolchain first (with `allowJs` so Flow and TS coexist), then leaf modules, then contracts — is safer but requires the build to support both type systems temporarily. Which does the team prefer?: Single PR is preferred. But would be great if the implementation plan is split into multiple manageable steps.

- **ESLint upgrade.** Stay on ESLint 7 with an older compatible `@typescript-eslint`, or upgrade ESLint (and `eslint-config-standard`, `eslint-plugin-vue`) as part of this work?: Upgrading is preferred, if possible.

- **`flowTyper.js` fate.** Parity settles the *checking* question — it is Flow-ignored, so it stays TypeScript-excluded. What remains open is purely mechanical: strip its Flow syntax in place (leaving a `.js` file), or rename to `.ts` with its generics preserved as-written but unchecked? The first is the smaller diff; the second is more consistent with the rest of the tree. Either way no new type coverage is added.: The second is preferred.

- **`@chelonia/*` packages.** These are external dependencies (`@chelonia/lib`, `@chelonia/cli`, `@chelonia/crypto`, `@chelonia/serdes`, `@chelonia/multiformats`). Do they ship TypeScript declarations? If not, ambient stubs will be needed, and the quality of contract-layer typing will be limited by their absence.: Let's start with ambient stubs for now.
- **Contract re-pinning.** Existing pins under `contracts/` are already-compiled frozen output and stay untouched. The open part is forward-looking: once the contract *source* is TypeScript, does the next `grunt pin:<version>` need a version bump purely because the emitted JS differs, even when behaviour is identical?: Do not do anything re this for now.

## Testing Guidelines

Create test file(s) in the `./test` folder for this migration, and create meaningful tests for the following cases, without going too heavy:

- **`flowTyper.js` behavioural equivalence** — the highest-value test. Cover each exported validator (`arrayOf`, `objectOf`, `objectMaybeOf`, `mapOf`, `literalOf`, `maybe`, `optional`, `object`, `mixed`, and the `isX` primitives) with both accepting and rejecting inputs, and assert that `TypeValidatorError` messages and scopes are unchanged. Write these tests **before** migrating the file so they run green against the Flow version first and serve as a genuine regression harness.
- **Contract validate/process determinism** — for `group.js`, `chatroom.js`, and `identity.js`, assert that a fixed sequence of actions produces identical resulting state before and after migration.
- **Build output integrity** — a check that the production build emits the expected bundles and that no Flow-stripping plugin remains in the esbuild plugin chain.
- **No residual Flow syntax** — a repo-wide assertion that stripping Flow types from any non-`contracts/` source file is a no-op, so the migration cannot silently regress.
- **Path alias resolution** — confirm each alias declared in `tsconfig.json` resolves to the same target as the corresponding `Gruntfile.js` alias, so the typechecker and bundler cannot drift apart.

Beyond new tests, the existing suites are the primary safety net: `grunt test:unit` and the full Cypress suite (`grunt test:cypress`) must both be green, with a baseline captured before migration begins so new failures are distinguishable from pre-existing ones.
