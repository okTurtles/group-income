# Spec for flow-to-typescript-migration

branch: sebin/task/postkey#6-migrate-to-typescript

## Summary

Group Income currently uses Flow for static typing. Flow is applied globally via `all=true` in `.flowconfig`, so type annotations appear throughout the codebase without needing a `@flow` pragma (only `Gruntfile.js` carries one). Flow types are erased at build time by `flow-remove-types` — once through a custom esbuild plugin for `.js` files, and again inside the custom Vue SFC plugin for `<script>` blocks.

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

By extension: **186 `.vue`** and **103 `.js`**. The `.vue` files are the bulk of the work and the highest-risk portion, since the project is on Vue 2.6 with Pug templates and a hand-rolled SFC compilation plugin.

The migration is not a mechanical find-and-replace. Three areas carry real risk and are called out explicitly below: the pinned contract snapshots, the `flowTyper.js` runtime validator library, and Vue 2.6 SFC typing.

## Functional Requirements

### Toolchain replacement

- Introduce a `tsconfig.json` at the project root. It must reproduce the path aliases currently expressed as `module.name_mapper` entries in `.flowconfig` and as aliases in `Gruntfile.js` (`@components`, `@containers`, `@model`, `@pages`, `@utils`, `@views`, `@view-utils`, plus the `@assets`, `@common`, `@controller`, `@svgs` aliases used by the build).
- Replace the `flow-remove-types` esbuild plugin (`scripts/esbuild-plugins/flow-remove-types-plugin.js`) with esbuild's native TypeScript loader. esbuild strips TS types but does **not** typecheck, so typechecking must become its own step.
- Replace the `exec:flow` Grunt task with a `tsc --noEmit` equivalent, and update the `lintTasks` list in `Gruntfile.js` that currently references it.
- Update `scripts/esbuild-plugins/vue-plugin.js` so SFC `<script>` blocks are handled as TypeScript instead of being passed through `flowRemoveTypes`.
- Replace `@babel/preset-flow` with `@babel/preset-typescript` in `.babelrc`. This path is used by `@babel/register` for the Mocha unit tests, so unit tests must keep running unchanged.
- Replace the ESLint Flow tooling — `eslint-plugin-flowtype`, `eslint-plugin-flowtype-errors`, and the `plugin:flowtype/recommended` extends entry in the `eslintConfig` block of `package.json` — with the TypeScript ESLint parser and plugin. Note the project is on ESLint 7.32 with `@babel/eslint-parser`; the chosen `@typescript-eslint` version must be compatible with ESLint 7, or ESLint must be upgraded as part of this work.
- Update the `flow` and `flow:vue` npm scripts. The `flow:vue` script currently lints `.vue` files through `eslint-plugin-flowtype-errors`; the TypeScript equivalent needs to cover SFC script blocks.
- Remove `flow-bin`, `flow-remove-types`, and the Flow-specific ESLint plugins from `package.json` once nothing references them.
- Delete `.flowconfig` once migration is complete.
- CI (`.github/workflows/ci.yml`) runs `grunt ci-test:unit`, which invokes the lint tasks. Typechecking must run in CI in place of Flow.

### Type declaration migration

- Convert `frontend/declarations.js` (Flow libdefs for globals such as `fetchServerTime`, `logger`, `process`, `Compartment`, `crypto`, and `declare module` stubs for `@hapi/*`, `pino`, etc.) into TypeScript ambient declarations (`.d.ts`).
- Replace `frontend/views/utils/vueComponentStub.js.flow` and the `.flowconfig` `module.name_mapper.extension` entries for `svg` and `vue` with TypeScript module declaration shims for `*.vue` and `*.svg` imports.
- `frontend/model/notifications/types.flow.js` is a dedicated Flow types module and should become a TypeScript types module.

### Source migration

- Convert Flow annotations to TypeScript across all 289 identified files, including the syntax differences that do not map one-to-one: maybe types (`?T` → `T | null | undefined`), exact object types (`{| |}`), variance sigils (`+`/`-`), `mixed` → `unknown`, `Object`/`Function` catch-alls, `$Keys`/`$Values`/`$Shape`/`$Exact` utility types, opaque types, and `import type` / `export type` forms.
- Rename migrated `.js` files to `.ts`, and update the imports that reference them. The ESLint config sets `import/extensions: [2, "ignorePackages"]`, so explicit extensions in import specifiers are enforced and will need updating in step with the renames.
- For `.vue` SFCs, move `<script>` blocks to `<script lang="ts">`. Templates remain Pug and are out of scope for typechecking.

### Areas requiring special handling

- **Pinned contracts.** `contracts/` holds frozen version-pinned snapshots (`gi.contracts_group`, `gi.contracts_chatroom`, `gi.contracts_identity`) produced by `grunt pin:<version>`. Per `docs/src/Calls-From-Contracts.md`, these are frozen in time and must keep behaving identically forever. The migration must not alter the runtime behaviour of any code that gets bundled into a pinned contract, and existing pinned snapshots must not be regenerated or rewritten as part of this work.
- **`flowTyper.js`.** `frontend/model/contracts/misc/flowTyper.js` (460 lines) is a **runtime** validator library, not erased type annotations. It uses Flow generic syntax (e.g. `mapOf<K, V>`, `objectOf<O: TypeValidatorRecord<*>>`) alongside runtime logic that inspects function names (`typeFn.name.includes('optional')`). Converting it risks changing runtime behaviour — particularly anything that depends on function `.name` values surviving compilation. It is bundled into pinned contracts, so behavioural equivalence is mandatory.
- **Vue 2.6 SFCs.** Vue 2.6's Options API has weak TypeScript inference compared to Vue 2.7+ or Vue 3. A decision is needed on how much type safety to pursue in the 186 SFCs versus simply making them compile (see Open Questions).
- **`historical/`** and **`ignored/`** are currently excluded by `.flowconfig`. The 3 Flow-syntax files found under `historical/` should be confirmed as in or out of scope rather than silently migrated.

## Possible Edge Cases

- **Silent runtime behaviour change in contracts.** Contract `process` functions must stay deterministic and byte-compatible in effect. A subtle difference introduced by the TypeScript compiler (class field initialisation order, `useDefineForClassFields`, helper injection, function name mangling) could desynchronise state across clients.
- **`flowTyper.js` name-based dispatch.** The `typeFn.name.includes('optional')` checks depend on function names being preserved. TypeScript downlevelling or minification could break this in ways typechecking will not catch.
- **esbuild does not typecheck.** After the switch, a type error no longer fails the build — only the separate `tsc --noEmit` step catches it. If that step is not wired into `grunt dev`, CI, and the lint task list, type errors will ship silently.
- **`import/extensions` rule vs `.ts` renames.** Renaming files while the ESLint rule enforces explicit extensions means imports and filenames must change atomically or lint breaks.
- **`.vue` and `.svg` imports.** These currently resolve through Flow's `module.name_mapper` to a stub. Without equivalent TypeScript shims, every SFC and inline-SVG import becomes an unresolved-module error.
- **Service worker code.** Chelonia runs in a service worker with its own esbuild entry (`esbuildOptionBags.serviceWorkers`) that uses `defaultPlugins`. Changing the default plugin list affects the service worker bundle as well as the main bundle.
- **Mixed-state period.** While migration is in progress the codebase will contain both `.js` (Flow) and `.ts` files. `allowJs` and the interop between them must be configured so the build is never broken on `master`.
- **Flow's `all=true` masking scope.** Because Flow checked everything implicitly, the true number of files that will produce *new* type errors under TypeScript's stricter checking is likely higher than the 289 files that contain annotations today.
- **ESLint 7 age.** `@typescript-eslint` releases that support ESLint 7 are themselves old; a forced ESLint upgrade would widen the blast radius into the whole lint config, including `standard`, `eslint-plugin-vue` 7, and the Cypress plugin.
- **Cypress and Mocha tests.** `test/` is Flow-ignored today but `test/backend.test.js` contains Flow syntax; test files need a consistent story.

## Acceptance Criteria

- `tsc --noEmit` passes with no errors across the migrated codebase.
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
- **Single PR or phased?** 289 files across build tooling, contracts, and 186 SFCs is very large for one reviewable change. A phased approach — toolchain first (with `allowJs` so Flow and TS coexist), then leaf modules, then contracts, then SFCs — is safer but requires the build to support both type systems temporarily. Which does the team prefer?
- **Vue SFC typing depth.** For the 186 Vue 2.6 SFCs, is the goal genuine type safety (which realistically implies upgrading to Vue 2.7 for `defineComponent` inference, or adopting `@vue/composition-api`), or simply "compiles under `lang="ts"` without meaningful inference"? This single decision drives most of the effort estimate.
- **Vue upgrade coupling.** Should a Vue 2.6 → 2.7 upgrade be bundled into this migration, kept as a prerequisite PR, or deferred entirely? Migration to Vue 3 is the next step. So for now, Just strip all FlowType syntaxes from Vue components.
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
