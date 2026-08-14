# Flow → TypeScript: Implementation Plan

Spec: [`_specs/flow-to-typescript-migration.md`](_specs/flow-to-typescript-migration.md) · Log: [`PROGRESS.md`](PROGRESS.md) · Branch: `sebin/task/postkey#6-migrate-to-typescript`

**Delivery:** one PR, built in 11 sequential steps. Each step ends with the repo in a working, committable state — `grunt dev` runs, `grunt test:unit` passes, the build succeeds. If a step can't end green, it's too big; split it.

**Decisions carried in from the spec's Open Questions:**

| Question | Decision |
|---|---|
| Strictness | Start permissive (`strict: false`, `allowJs`), tighten later |
| Delivery | Single PR, staged steps |
| ESLint | Upgrade, but **last** — see Step 10 for why |
| `flowTyper.js` | Rename to `.ts`, generics preserved as-written, **not** typechecked |
| `@chelonia/*` | Ambient stubs for now |
| Re-pinning contracts | Do nothing |

---

## The mechanism that makes this incremental

`scripts/esbuild-plugins/flow-remove-types-plugin.js:14` filters on `/\.js$/`. A `.ts` file never reaches it and is handled by esbuild's native TypeScript loader instead. **So Flow `.js` and TypeScript `.ts` coexist in the same build with no extra configuration.**

That single fact sets the whole order below: convert sources file-by-file while Flow tooling stays live, and delete Flow only once nothing needs it (Step 9). The alternative — removing `flow-remove-types` early — breaks all 99 remaining Flow files at once.

**Scope reminder:** 99 Flow-checked `.js` files to convert, 6 Flow-ignored-but-built files to strip, `historical/` untouched. TypeScript checks exactly what Flow checked — no coverage expansion.

---

## Step 0 — Baseline and regression harness

**Why first:** the `flowTyper.js` tests are only meaningful if written against the *Flow* version. Write them after migrating and they encode whatever the migration did, bugs included.

- Capture a pre-migration baseline: `grunt test:unit` and `grunt test:cypress` output saved so new failures are distinguishable from pre-existing ones.
- Write `test/flowTyper-equivalence.test.js` against the current Flow `flowTyper.js`: every exported validator (`arrayOf`, `objectOf`, `objectMaybeOf`, `mapOf`, `literalOf`, `maybe`, `optional`, `object`, `mixed`, `isX` primitives), accepting **and** rejecting inputs, asserting `TypeValidatorError` messages and scopes verbatim.
- Add a `scripts/` helper that reports files still containing Flow syntax (the `flow-remove-types` + diff check used to scope this work). It becomes the Step 9 gate and the standing regression check.

**Done when:** new tests pass against the unmodified Flow codebase; baseline recorded in `PROGRESS.md`.

---

## Step 1 — `tsconfig.json` and a non-blocking typecheck

No source changes. Establishes the parity contract before anything moves.

- `tsconfig.json` at root with `allowJs: true`, `checkJs: false`, `noEmit: true`, `strict: false`, `target`/`module` matching the esbuild output, and `paths` mirroring every `Gruntfile.js` alias (`@components`, `@containers`, `@model`, `@pages`, `@utils`, `@views`, `@view-utils`, `@assets`, `@common`, `@controller`, `@svgs`).
- `exclude` transcribed from the spec's ignore table — the 14 live `.flowconfig` `[ignore]` entries. Do **not** carry the 6 stale or 2 redundant ones.
- Add `npm run typecheck` → `tsc --noEmit`. Not yet in `lintTasks` or CI; it has nothing to check.

**Done when:** `npm run typecheck` exits 0 (trivially — no `.ts` files yet), and the `exclude` list has been diffed against `.flowconfig` line by line.

---

## Step 2 — Ambient declarations

Everything Step 4 onward will depend on. Nothing here changes runtime behaviour.

- `frontend/declarations.js` (311 lines of Flow libdefs) → `frontend/declarations.d.ts`: globals (`fetchServerTime`, `logger`, `process`, `Compartment`, `crypto`) and `declare module` stubs (`@hapi/*`, `pino`, …).
- `*.vue` and `*.svg` module shims replacing `frontend/views/utils/vueComponentStub.js.flow` and the `.flowconfig` `module.name_mapper.extension` entries. Keep them loose — `any`-typed default export — since SFCs carry no type information.
- Ambient stubs for `@chelonia/lib`, `@chelonia/cli`, `@chelonia/crypto`, `@chelonia/serdes`, `@chelonia/multiformats`. Check first whether any ship their own `.d.ts`; only stub what doesn't.
- `frontend/model/notifications/types.flow.js` (52 lines) → `types.ts`.

**Done when:** `npm run typecheck` still passes and the declarations are referenced by `tsconfig.json`.

---

## Step 3 — Teach the build about `.ts` (Flow stays)

Both type systems live side by side after this step. Nothing is removed.

- Add `.ts` to esbuild `resolveExtensions` so extensionless and renamed imports resolve.
- `.babelrc`: add `@babel/preset-typescript` **alongside** `@babel/preset-flow`. Babel applies presets by file extension, so `.js` keeps Flow handling and `.ts` gets TypeScript. This keeps `@babel/register` working for Mocha throughout.
- Extend the ESLint glob from `**/*.{js,vue}` to `**/*.{js,ts,vue}`. `@babel/eslint-parser` parses `.ts` via the newly added preset — no `@typescript-eslint` needed yet, which is exactly why the ESLint upgrade can wait until Step 10.
- Add `.ts` to the `grunt dev` watch patterns (`Gruntfile.js:769` and the extension check at `:796`).

**Verify with a throwaway:** rename one trivial leaf file to `.ts`, confirm `grunt dev`, `grunt build`, `grunt test:unit`, and lint all handle it, then either keep it or revert it.

**Done when:** a `.ts` file builds, lints, hot-reloads, and runs under Mocha, with Flow files still working unchanged.

---

## Steps 4–8 — Source conversion, leaf-first

Same procedure for each wave: convert Flow syntax → TypeScript, rename `.js` → `.ts`, update importers' explicit extensions (`import/extensions` is set to `ignorePackages`, so specifiers and filenames must change together in one commit), run `npm run typecheck` + `grunt test:unit`.

Recurring syntax translations: `?T` → `T | null | undefined`; `{| |}` → plain object types; `+`/`-` variance → `readonly` where it applies; `mixed` → `unknown`; `Object`/`Function` → `any` initially (tighten later, not now); `$Keys`/`$Values`/`$Shape`/`$Exact` → `keyof`/indexed access/`Partial`/exact-ish equivalents; `import type` carries over directly.

| Step | Wave | Files | Notes |
|---|---|---|---|
| **4** | `frontend/common` (3), `frontend/utils` (8) | 11 | Leaf utilities, few dependents. Smallest wave first to shake out the translation patterns. |
| **5** | `frontend/model/contracts/**` | 17 | **Highest risk — see below.** |
| **6** | `frontend/model/**` (non-contract): root 10, `chatroom` 3, `notifications` 10, `settings` 1 | 24 | Depends on Steps 4–5. |
| **7** | `frontend/controller/**`: root 3, `actions` 9, `app` 3, `e2e` 1, `serviceworkers` 3, `utils` 1 | 20 | `serviceworkers/sw-primary.js` is its own esbuild entry — rebuild and smoke-test the SW bundle specifically. |
| **8** | `frontend/views/**` `.js`: `views/utils` 13, `containers/chatroom` 5, `chat-mentions` 2, `components/*` 3, `containers/payments` 1, `roles-and-permissions` 1 — plus root `frontend/setupChelonia.js` | 27 | View-layer helpers imported by SFCs. SFCs themselves stay untouched plain JS. |

**Total: 99.**

### Step 5 in detail — contract source

This is where a mistake is expensive and slow to surface: per `docs/src/Calls-From-Contracts.md`, anything reachable from a contract is frozen forever once pinned, and a behavioural difference desynchronises state across clients rather than throwing.

- `group.js`, `chatroom.js`, `identity.js`, and `shared/**` (`constants`, `currencies`, `functions`, `time`, `validators`, `distribution/`, `getters/`, `payments/`, `voting/`) — 17 files.
- **`flowTyper.js` is not part of this wave.** It's Flow-ignored, so per parity it stays untypechecked. Rename to `flowTyper.ts` with its generics preserved exactly as written (per the spec decision) and add it to `tsconfig` `exclude`. Runtime behaviour must be byte-for-byte equivalent — the `typeFn.name.includes('optional')` dispatch depends on function `.name` surviving compilation, which no typechecker will catch if broken. The Step 0 harness is the gate.
- Do **not** run `grunt pin`. Existing snapshots under `contracts/` must be untouched.
- Verify `frontend/model/contracts/manifests.json` is byte-identical after a production build — contract hashes must not move.

**Done when each wave:** typecheck passes, unit tests pass, build succeeds, and — for Step 5 — contract hashes and `flowTyper` equivalence tests are unchanged.

---

## Step 9 — Remove Flow

Only now is nothing depending on it.

- Strip Flow syntax from the 6 Flow-ignored-but-built files: `Gruntfile.js`, `frontend/controller/service-worker.js`, `frontend/model/contracts/shared/distribution/distribution.test.js`, `scripts/refcount-fuzzer.js`, `test/backend.test.js` (`flowTyper.js` was handled in Step 5). Syntax removal only — **no type coverage added**, these stay excluded.
- Remove `flowRemoveTypesPlugin` from `defaultPlugins` (`Gruntfile.js:707,712`) and delete `scripts/esbuild-plugins/flow-remove-types-plugin.js`.
- `.babelrc`: drop `@babel/preset-flow`, keep `@babel/preset-typescript`.
- Replace `exec:flow` (`Gruntfile.js:301`) with a `tsc --noEmit` task; update `lintTasks` (`:463`); remove the `flow stop` call (`:874`).
- Delete `.flowconfig`. Remove `flow-bin`, `flow-remove-types`, `@babel/preset-flow` from `package.json`; replace the `flow` npm script with `typecheck`.
- CI (`.github/workflows/ci.yml`) runs `grunt ci-test:unit`, which invokes `lintTasks` — so typechecking enters CI automatically via the task list. Confirm rather than assume.

**Gate:** the Step 0 residual-Flow checker reports zero files outside `node_modules/`, `dist/`, `contracts/`, and `historical/`.

---

## Step 10 — ESLint stack upgrade

Deliberately last. Doing it earlier would mean finding an `eslint-plugin-flowtype` build that runs on ESLint 8 — extra work for tooling being deleted anyway. By now the Flow plugins are gone, so nothing constrains the upgrade.

- ESLint 7.32 → **8.57.1**, not 9. ESLint 9 requires flat config and drops `package.json` `eslintConfig` support, which would force rewriting the whole config; 8.57.1 keeps the existing `eslintConfig` block working and satisfies `@typescript-eslint` v8's minimum of ESLint ≥ 8.57.0. CI's Node 22 clears the Node ≥ 18.18 floor.
- Add `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` v8. Set `parser` for `.ts` via an `overrides` block so `.vue` files keep `@babel/eslint-parser` — `eslint-plugin-vue` still needs it. Start with `plugin:@typescript-eslint/recommended`; **defer type-aware linting** (`recommended-type-checked`) — it needs `projectService`/`project` wiring and is a meaningful slowdown, so it belongs to the later strictness pass.
- Companion bumps ESLint 8 requires: `eslint-config-standard` 16 → 17.1, `eslint-plugin-vue` 7 → 9, `eslint-plugin-promise` 4 → 6, `eslint-plugin-import` → 2.29+, and `eslint-plugin-node` → `eslint-plugin-n` (renamed).
- Remove `eslint-plugin-flowtype`, `eslint-plugin-flowtype-errors`, and the `plugin:flowtype/recommended` extends entry.
- **Expect new findings.** `eslint-plugin-vue` 7 → 9 adds rules, and the Step 002 discovery still applies: the removed `}: Object)` cast had been hiding 182 components from `vue/*` rules entirely. Fix what it surfaces or explicitly disable with a reason — don't blanket-disable.

**Done when:** `npm run lint` passes on `.js`, `.ts`, and `.vue`.

---

## Step 11 — Verification and close-out

Run the spec's Acceptance Criteria as a checklist:

- [ ] `npm run typecheck` clean; `exclude` list matches `.flowconfig` `[ignore]` entry-for-entry (only the 6 stale + 2 redundant omitted, justified in the PR description)
- [ ] `Gruntfile.js` excluded from `tsc` yet updated as build config — both true, neither an oversight
- [ ] No `.flowconfig`, `flow-bin`, `flow-remove-types`, or Flow ESLint plugins anywhere
- [ ] Residual-Flow checker: zero files outside `node_modules/`, `dist/`, `contracts/`, `historical/`
- [ ] `grunt dev` starts, builds, hot-reloads · `NODE_ENV=production grunt build` works
- [ ] `grunt test:unit` passes · `grunt test:cypress` has no new failures vs. the Step 0 baseline
- [ ] `npm run lint` and `npm run stylelint` pass · CI green with typecheck in place of Flow
- [ ] `contracts/` snapshots unchanged; `manifests.json` byte-identical
- [ ] `flowTyper` equivalence tests pass
- [ ] Manual E2E: group creation, chat, distribution/payments

Remaining test work from the spec's Testing Guidelines, if not already added: contract validate/process determinism for `group`/`chatroom`/`identity`; build-output integrity (no Flow plugin in the esbuild chain); path-alias resolution parity between `tsconfig.json` and `Gruntfile.js`.

---

## Sequencing constraints

These are the orderings that actually matter — everything else is preference.

1. **Step 0 before Step 5.** `flowTyper` tests must be written against the Flow version or they prove nothing.
2. **Step 2 before Step 4.** Declarations must exist before converted files import through them.
3. **Step 3 before any conversion.** The build must resolve `.ts` first.
4. **Steps 4–8 before Step 9.** Removing `flow-remove-types` while Flow files remain breaks the build.
5. **Step 9 before Step 10.** Avoids needing `eslint-plugin-flowtype` on ESLint 8.
6. **Leaf-first within 4–8.** Converting a dependency after its dependents means typechecking against `any` and re-doing the work.

## Deferred — explicitly not this PR

- Tightening `strict`, `noImplicitAny`, `strictNullChecks`; replacing the `any`s that stand in for Flow's `Object`/`Function`
- Type-aware ESLint rules (`recommended-type-checked`)
- Typing `.vue` SFCs — belongs to the Vue 3 migration
- Real `@chelonia/*` types, if those packages ship declarations later
- Reconciling `eslintIgnore` with `.flowconfig` (the two lists differ today)
- Re-pinning contracts
