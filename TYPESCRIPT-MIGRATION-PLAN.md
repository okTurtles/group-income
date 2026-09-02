# Flow → TypeScript: Implementation Plan

Spec: [`_specs/flow-to-typescript-migration.md`](_specs/flow-to-typescript-migration.md) · Log: [`PROGRESS.md`](PROGRESS.md) · Branch: `sebin/task/postkey#6-migrate-to-typescript`

**Delivery:** one PR, built in 11 sequential steps. Each step ends with the repo in a working, committable state — `grunt dev` runs, `grunt test:unit` passes, the build succeeds. If a step can't end green, it's too big; split it.

**Decisions carried in from the spec's Open Questions:**

| Question | Decision |
|---|---|
| Strictness | Start permissive (`strict: false`, `allowJs`, `skipLibCheck`), tighten later |
| Delivery | Single PR, staged steps |
| ESLint | Upgrade, but **last** — see Step 10 for why |
| `flowTyper.js` | Rename to `.ts`, generics preserved as-written, **not** typechecked |
| `@chelonia/*` | ~~Ambient stubs~~ → **use the shipped declarations.** Four of the five packages ship real `.d.cts`/`.d.mts`; only `@chelonia/cli` doesn't, and nothing in `frontend/` imports it. See Step 2. |
| Re-pinning contracts | Do nothing |
| Test files (`*.test.js`) | Stay `.js` this PR — Flow-ignored already, and Mocha's spec glob is `.js`-only. See Step 3. |

---

## The mechanism that makes this incremental

`scripts/esbuild-plugins/flow-remove-types-plugin.js:14` filters on `/\.js$/`. A `.ts` file never reaches it and is handled by esbuild's native TypeScript loader instead. **So Flow `.js` and TypeScript `.ts` coexist in the same build with no extra configuration.**

That single fact sets the whole order below: convert sources file-by-file while Flow tooling stays live, and delete Flow only once nothing needs it (Step 9). The alternative — removing `flow-remove-types` early — breaks all 99 remaining Flow files at once.

**Scope reminder, re-measured at `37bc114e9`:** 116 files still contain Flow syntax. Subtract the 8 in `historical/` (out of scope, untouched) and the tree splits into:

| | Count | Treatment |
|---|---:|---|
| Flow-checked `.js` | **101** | Convert to `.ts` (2 of them in Step 2, 99 across Steps 4–8) |
| Flow-ignored but still built | 6 | Strip syntax only, stay `.js`, stay unchecked |
| `.js.flow` stub | 1 | `vueComponentStub.js.flow` — replaced by module shims in Step 2 |
| **In scope** | **108** | |

TypeScript checks exactly what Flow checked — no coverage expansion.

**Changed since the plan was first written (`21a9ad30c`):** the v2.9.0 merges added **2** Flow-checked files — `frontend/utils/markdown-parsers.js` (#3120) and `frontend/views/containers/chatroom/voice-recording/voice-recording-utils.js` (#3134). That's the whole delta: 99 → 101. No new Flow appeared in `.vue` files, so the Step 002 strip still holds — the only Flow `.vue` files left are the 2 in `historical/`.

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

- **Install `typescript`** as a devDependency. It is not currently in `package.json` — nothing in the repo depends on it yet, so this is the step that introduces it.
- `tsconfig.json` at root with `allowJs: true`, `checkJs: false`, `noEmit: true`, `strict: false`, `skipLibCheck: true`, `target`/`module` matching the esbuild output, and `paths` mirroring every `Gruntfile.js` alias (`Gruntfile.js:168-184`): `@assets`, `@common`, `@components`, `@containers`, `@controller`, `@model`, `@pages`, `@svgs`, `@utils`, `@view-utils`, `@views`, plus `~`. Note `.flowconfig` maps only 8 of these (`:44-50`) — the extra three are a deliberate correction, not parity drift, since esbuild resolves all eleven.
- **`moduleResolution: "bundler"` — required, not a preference.** 11 of the 15 `@chelonia` import specifiers in `frontend/` are subpaths (`@chelonia/lib/events`, `@chelonia/lib/Secret`, `@chelonia/lib/SPMessage`, …). Those packages expose their declarations through the `exports` map's `types` condition; only the bare `.` entry has a top-level `types` field. Under classic `moduleResolution: "node"` every subpath import resolves to nothing and errors. `"bundler"` also matches how esbuild actually resolves, which is the honest description of this build.
- `exclude` transcribed from the spec's ignore table — the 14 live `.flowconfig` `[ignore]` entries (22 total at `.flowconfig:9-30`, minus 6 stale and 2 redundant). Do **not** carry the 6 stale or 2 redundant ones.
- Add `npm run typecheck` → `tsc --noEmit`. Not yet in `lintTasks` or CI; it has nothing to check.

**Done when:** `npm run typecheck` exits 0 (trivially — no `.ts` files yet), and the `exclude` list has been diffed against `.flowconfig` line by line.

---

## Step 2 — Ambient declarations

Everything Step 4 onward will depend on. Nothing here changes runtime behaviour.

- `frontend/declarations.js` (311 lines of Flow libdefs) → `frontend/declarations.d.ts`: globals (`fetchServerTime`, `logger`, `process`, `Compartment`, `crypto`) and `declare module` stubs (`@hapi/*`, `pino`, …).
- `*.vue` and `*.svg` module shims replacing `frontend/views/utils/vueComponentStub.js.flow` and the `.flowconfig` `module.name_mapper.extension` entries. Keep them loose — `any`-typed default export — since SFCs carry no type information.
- **`@chelonia/*` need no stubs — checked, and they ship declarations.** The "only stub what doesn't" check has been run:

  | Package | Declarations | Action |
  |---|---|---|
  | `@chelonia/lib` 1.5.0 | `exports` map, `types` per subpath (`dist/cjs/*.d.cts`, `dist/esm/*.d.mts`) | Use as-is |
  | `@chelonia/crypto` 1.0.1 | `./dist/umd/index.d.cts` | Use as-is |
  | `@chelonia/serdes` 1.0.1 | `dist/umd/index.d.cts` | Use as-is |
  | `@chelonia/multiformats` 1.0.0 | `dist/umd/index.d.cts` | Use as-is |
  | `@chelonia/cli` 3.4.0 | none | No stub needed — nothing in `frontend/` imports it; it's the `chel serve` binary |

  Reaching them requires the `moduleResolution: "bundler"` set in Step 1.

  **This makes Steps 4–8 harder, not easier, and that is the point.** Stubs would have made every `@chelonia` value `any` and let the waves through unchallenged; real declarations mean real errors at the largest API surface the frontend touches. Budget for it. Where a genuine mismatch surfaces, prefer `@ts-expect-error` with a one-line reason over reshaping runtime code — behaviour changes are out of scope for this PR, and an untangled `@ts-expect-error` is a visible TODO where a silent `any` is not.
- `frontend/model/notifications/types.flow.js` (52 lines) → `types.ts`. **Counted here, not in Step 6** — it lives in `frontend/model/notifications/`, so don't convert it twice.

**Done when:** `npm run typecheck` still passes and the declarations are referenced by `tsconfig.json`.

---

## Step 3 — Teach the build about `.ts` (Flow stays)

Both type systems live side by side after this step. Nothing is removed.

- ~~Add `.ts` to esbuild `resolveExtensions`.~~ **There is no `resolveExtensions` in `Gruntfile.js`**, and esbuild's default already includes `.ts`. Nothing to do — but nothing to rely on either, because of the next point.
- **Aliased imports get no extension inference at all.** `alias-plugin.js:38,45` returns a concrete `path` from `onResolve`, and esbuild uses a plugin-returned path verbatim — it never appends or guesses an extension. So `@utils/foo.js` keeps pointing at a file that no longer exists the moment `foo.js` becomes `foo.ts`. Every aliased specifier must be hand-edited alongside the rename. `import/extensions: ignorePackages` already forces explicit extensions, so this is mechanical — but it is now the *only* mechanism, not a lint preference.
- `.babelrc`: add `@babel/preset-typescript` **alongside** `@babel/preset-flow`. Babel applies presets by file extension, so `.js` keeps Flow handling and `.ts` gets TypeScript.
- **`scripts/mocha-helper.js:8` must pass `extensions: ['.js', '.ts']` to `@babel/register`.** The preset alone is not enough: Babel's require hook defaults to `['.js', '.jsx', '.es6', '.es', '.mjs']` and will not intercept `.ts` at all. Miss this and the first Mocha test that reaches a converted file dies at `require` time with a syntax error — which reads like a Babel misconfiguration and isn't.
- **Keep every `*.test.js` as `.js`.** `exec:test`'s spec glob (`Gruntfile.js:309`) matches `*.test.js` only, so a renamed test file stops running *silently* — green output, one fewer suite. Five of them sit inside conversion waves (`frontend/common/stringTemplate.test.js`, and `currencies` / `time` / `voting/rules` / `distribution/mincome-proportional` under `contracts/shared/`). They're Flow-ignored anyway (`.flowconfig:30`), so parity says leave them; widening the glob to `*.test.{js,ts}` is the deferred alternative, not this PR's job.
- ESLint globs — **three places, not one**: `package.json` `eslint` and `eslintfix` scripts, and `exec:eslint` at `Gruntfile.js:298`. All go from `**/*.{js,vue}` to `**/*.{js,ts,vue}`. `@babel/eslint-parser` parses `.ts` via the newly added preset — no `@typescript-eslint` needed yet, which is exactly why the ESLint upgrade can wait until Step 10.
- Add `.ts` to the `grunt dev` watch pattern (`Gruntfile.js:769`, `frontend/**/*.js` → `frontend/**/*.{js,ts}`). The extension check at `:796` needs no `.ts` branch — a `.ts` file has no `flowRemoveTypesPluginOptions.cache` entry to evict — but confirm it doesn't fall into the `.js` branch.

**Verify with a throwaway:** rename one trivial leaf file to `.ts`, confirm `grunt dev`, `grunt build`, `grunt test:unit`, and lint all handle it, then either keep it or revert it.

**Done when:** a `.ts` file builds, lints, hot-reloads, and runs under Mocha, with Flow files still working unchanged.

---

## Step 3a — The four hardcoded `.js` paths

Small, but its own step because these are the renames that break the build from *outside* the file being renamed, so no amount of care inside a wave catches them.

`Gruntfile.js` names four source paths as literal strings. Two are entry points that Steps 5 and 7 will rename; two must never be renamed at all.

| `Gruntfile.js` | String | When |
|---|---|---|
| `:677` | `${contractsDir}/{group,chatroom,identity}.js` — contract entry points | **Update in Step 5**, same commit as the rename |
| `:663` | `./frontend/controller/serviceworkers/sw-primary.js` — SW entry point | **Update in Step 7**, same commit as the rename |
| `:684` | `contractsSlim.external = ['@common/common.js', …]` | **Never** — see below |
| `:77` | `mainSrc = frontend/main.js` — main entry point | **Never** — see below |

`frontend/common/common.js` and `frontend/main.js` contain **no Flow syntax**, so scope parity already excludes them from conversion — the risk is a "convert the whole directory" reflex in Step 4, not the plan. Renaming `common.js` would break the slim-contract `external` match, change what gets bundled into the slim contracts, and **move contract hashes** — failing Step 5's central invariant from a file in a different wave entirely.

**Done when:** the table is transcribed into the Step 5 and Step 7 checklists, and Step 4's diff shows `frontend/common/common.js` untouched.

---

## Steps 4–8 — Source conversion, leaf-first

Same procedure for each wave: convert Flow syntax → TypeScript, rename `.js` → `.ts`, update importers' explicit extensions (`import/extensions` is set to `ignorePackages`, so specifiers and filenames must change together in one commit), run `npm run typecheck` + `grunt test:unit`.

Recurring syntax translations: `?T` → `T | null | undefined`; `{| |}` → plain object types; `+`/`-` variance → `readonly` where it applies; `mixed` → `unknown`; `Object`/`Function` → `any` initially (tighten later, not now); `$Keys`/`$Values`/`$Shape`/`$Exact` → `keyof`/indexed access/`Partial`/exact-ish equivalents; `import type` carries over directly.

| Step | Wave | Files | Notes |
|---|---|---|---|
| **4** | `frontend/common` 3, `frontend/utils` **9** | **12** | Leaf utilities, few dependents. Smallest wave first to shake out the translation patterns. `frontend/utils` gained `markdown-parsers.js` in v2.9.0. **Do not touch `frontend/common/common.js`** — no Flow in it, and it's an esbuild `external` (Step 3a). |
| **5** | `frontend/model/contracts/**` | 17 | 19 files in the tree contain Flow; 2 of them (`misc/flowTyper.js`, `shared/distribution/distribution.test.js`) are Flow-ignored and belong to the strip-only set. **Highest risk — see below.** |
| **6** | `frontend/model/**` (non-contract): root 10, `chatroom` 3, `notifications` **9**, `settings` 1 | **23** | Depends on Steps 4–5. `notifications` holds 10 Flow files, but `types.flow.js` was already converted in Step 2 — 9 remain here. |
| **7** | `frontend/controller/**`: root 3, `actions` 9, `app` 3, `e2e` 1, `serviceworkers` 3, `utils` 1 | 20 | Controller root holds 4 Flow files; `service-worker.js` is Flow-ignored (strip-only), leaving 3. `serviceworkers/sw-primary.js` is its own esbuild entry — update `Gruntfile.js:663` in the same commit (Step 3a), then rebuild and smoke-test the SW bundle specifically. |
| **8** | `frontend/views/**` `.js`: `views/utils` 13, `containers/chatroom` 5, `chat-mentions` 2, **`voice-recording` 1**, `components/*` 3, `containers/payments` 1, `roles-and-permissions` 1 — plus root `frontend/setupChelonia.js` | **27** | `views/utils` holds 14 entries; one is the `vueComponentStub.js.flow` stub retired in Step 2, leaving 13. `voice-recording/voice-recording-utils.js` is new in v2.9.0. View-layer helpers imported by SFCs; SFCs themselves stay untouched plain JS. |

**Total across 4–8: 99.** Plus the 2 converted in Step 2 (`declarations.js`, `notifications/types.flow.js`) = **101 Flow-checked files**, which reconciles with the scope table above.

### Step 5 in detail — contract source

This is where a mistake is expensive and slow to surface: per `docs/src/Calls-From-Contracts.md`, anything reachable from a contract is frozen forever once pinned, and a behavioural difference desynchronises state across clients rather than throwing.

- `group.js`, `chatroom.js`, `identity.js`, and `shared/**` (`constants`, `currencies`, `functions`, `time`, `validators`, `distribution/`, `getters/`, `payments/`, `voting/`) — 17 files.
- **`flowTyper.js` is not part of this wave.** It's Flow-ignored (`.flowconfig:22`), so per parity it stays untypechecked. Rename to `flowTyper.ts` with its generics preserved exactly as written (per the spec decision) and add it to `tsconfig` `exclude`. **Also update the matching `eslintIgnore` entry** in `package.json` — it names `frontend/model/contracts/misc/flowTyper.js` by path, and a stale entry there silently starts linting a file that was deliberately exempt. Runtime behaviour must be byte-for-byte equivalent — the `typeFn.name.includes('optional')` dispatch depends on function `.name` surviving compilation, which no typechecker will catch if broken. The Step 0 harness is the gate.
- **Update the contract entry points at `Gruntfile.js:677`** in the same commit as the `group.js` / `chatroom.js` / `identity.js` renames (Step 3a). Nothing else in the build knows those paths.
- Do **not** run `grunt pin`. Existing snapshots under `contracts/` must be untouched — the current pinned set runs to `2.9.0`, and `chelonia.json` points at it.
- Verify `frontend/model/contracts/manifests.json` is byte-identical after a production build — contract hashes must not move.

**Done when each wave:** typecheck passes, unit tests pass, build succeeds, and — for Step 5 — contract hashes and `flowTyper` equivalence tests are unchanged.

---

## Step 9 — Remove Flow

Only now is nothing depending on it.

- Strip Flow syntax from the 6 Flow-ignored-but-built files: `Gruntfile.js`, `frontend/controller/service-worker.js`, `frontend/model/contracts/shared/distribution/distribution.test.js`, `scripts/refcount-fuzzer.js`, `test/backend.test.js` (`flowTyper.js` was handled in Step 5). Syntax removal only — **no type coverage added**, these stay excluded.
- Remove `flowRemoveTypesPlugin` from `defaultPlugins` (`Gruntfile.js:707,712`) and delete `scripts/esbuild-plugins/flow-remove-types-plugin.js`.
- `.babelrc`: drop `@babel/preset-flow`, keep `@babel/preset-typescript`.
- Replace `exec:flow` (`Gruntfile.js:301`) with a `tsc --noEmit` task; update `lintTasks` (`:463`); remove the `flow stop` call (`:874`) and the `@flow`/`all`-option comment at `:216-217`.
- Delete `.flowconfig`. Remove `flow-bin`, `flow-remove-types`, `@babel/preset-flow` from `package.json`; replace the `flow` npm script with `typecheck`.
- **CI wiring — confirmed, not assumed.** `.github/workflows/ci.yml:24` runs `grunt ci-test:unit`, which is `['build', 'chelDeploy', 'backend:launch', 'exec:test']` (`Gruntfile.js:855`); `build` runs `lintTasks` unless `:skiplint` (`:463-466`). So swapping `exec:flow` for the `tsc` task does put typechecking in CI, with no workflow edit. Note the other job, `ci-test:cypress` (`:856`), uses `build:skiplint` and therefore never typechecked under Flow either — leave it that way.

**Gate:** the Step 0 residual-Flow checker reports zero files outside `node_modules/`, `dist/`, `contracts/`, and `historical/`.

---

## Step 10 — ESLint stack upgrade

Deliberately last. Doing it earlier would mean finding an `eslint-plugin-flowtype` build that runs on ESLint 8 — extra work for tooling being deleted anyway. By now the Flow plugins are gone, so nothing constrains the upgrade.

- ESLint 7.32 → **8.57.1**, not 9. ESLint 9 requires flat config and drops `package.json` `eslintConfig` support, which would force rewriting the whole config; 8.57.1 keeps the existing `eslintConfig` block working and satisfies `@typescript-eslint` v8's minimum of ESLint ≥ 8.57.0. CI's Node 22 clears the Node ≥ 18.18 floor.
- Add `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` v8. Set `parser` for `.ts` via an `overrides` block so `.vue` files keep `@babel/eslint-parser` — `eslint-plugin-vue` still needs it. Start with `plugin:@typescript-eslint/recommended`; **defer type-aware linting** (`recommended-type-checked`) — it needs `projectService`/`project` wiring and is a meaningful slowdown, so it belongs to the later strictness pass.
- Companion bumps ESLint 8 requires, all versions confirmed against `package.json`: `eslint-config-standard` 16.0.2 → 17.1, `eslint-plugin-vue` 7.20.0 → 9, `eslint-plugin-promise` 4.2.1 → 6, `eslint-plugin-import` 2.22.1 → 2.29+, and `eslint-plugin-node` 11.1.0 → `eslint-plugin-n` (renamed).
- Removing Flow from ESLint is **three** edits to the `package.json` `eslintConfig` block, not one — miss any and the config fails to load once the plugin is uninstalled: the `plugin:flowtype/recommended` entry in `extends`, `"flowtype"` in `plugins`, and the `flowtype/no-types-missing-file-annotation` entry in `rules`. Then drop both packages. `eslint-plugin-flowtype-errors` is a devDependency with **no** config entry — package removal only.
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
- [ ] **Unit-test suite count matches the Step 0 baseline** — guards against a `*.test.js` rename dropping a suite out of Mocha's glob without failing anything
- [ ] **`frontend/common/common.js` and `frontend/main.js` still `.js`**, and the slim-contract `external` at `Gruntfile.js:684` still matches
- [ ] Manual E2E: group creation, chat, distribution/payments

Remaining test work from the spec's Testing Guidelines, if not already added: contract validate/process determinism for `group`/`chatroom`/`identity`; build-output integrity (no Flow plugin in the esbuild chain); path-alias resolution parity between `tsconfig.json` and `Gruntfile.js`.

---

## Sequencing constraints

These are the orderings that actually matter — everything else is preference.

1. **Step 0 before Step 5.** `flowTyper` tests must be written against the Flow version or they prove nothing.
2. **Step 2 before Step 4.** Declarations must exist before converted files import through them.
3. **Step 3 before any conversion.** The build must resolve `.ts`, and Mocha must load it, first.
4. **Steps 4–8 before Step 9.** Removing `flow-remove-types` while Flow files remain breaks the build.
5. **Step 9 before Step 10.** Avoids needing `eslint-plugin-flowtype` on ESLint 8.
6. **Leaf-first within 4–8.** Converting a dependency after its dependents means typechecking against `any` and re-doing the work.
7. **Rename and importer-update in one commit.** The alias plugin does no extension inference (Step 3), so a rename without its specifiers is a broken build, not a lint warning — the two halves cannot be split across commits.

## Deferred — explicitly not this PR

- Tightening `strict`, `noImplicitAny`, `strictNullChecks`; replacing the `any`s that stand in for Flow's `Object`/`Function`; clearing the `@ts-expect-error`s left against `@chelonia/*`
- Converting `*.test.js` files, and widening Mocha's spec glob to `*.test.{js,ts}` to allow it
- Type-aware ESLint rules (`recommended-type-checked`)
- Typing `.vue` SFCs — belongs to the Vue 3 migration
- Real `@chelonia/*` types, if those packages ship declarations later
- Reconciling `eslintIgnore` with `.flowconfig` (the two lists differ today)
- Re-pinning contracts
