# Flow → TypeScript Migration: Progress Log

Spec: [`_specs/flow-to-typescript-migration.md`](_specs/flow-to-typescript-migration.md) · Branch: `sebin/task/postkey#6-migrate-to-typescript`

One entry per step. Append-only — supersede a decision with a new entry rather than editing an old one.

**Baseline:** 289 files contain Flow syntax (186 `.vue`, 103 `.js`), measured by stripping each file with `flow-remove-types` and diffing. Excludes `node_modules/`, `dist/`, and pinned `contracts/`. *(Re-measured in 003 — the `.js` figure was an undercount; the accurate number is 111.)*

**Governing principle — scope parity with Flow.** This is a type-system swap, not a coverage expansion. TypeScript checks exactly what Flow checked: every `.flowconfig` `[ignore]` path gets a matching `tsconfig.json` `exclude`. Files Flow never checked stay unchecked; where they contain Flow syntax the job is to strip it so they still parse, not to type them.

---

### 001 — Migration spec written

**Status:** DONE

Scoped the migration. Flagged the three real risks: pinned contracts must stay behaviourally frozen; `flowTyper.js` is runtime code (dispatches on function `.name`), not erasable types; esbuild doesn't typecheck, so `tsc --noEmit` must be wired into lint + CI or type errors ship silently.

### 002 — Drop all Flow annotations from `.vue` files

**Status:** DONE

**What:**
Stripped Flow from **184** `.vue` files — collapsed the `export default ({ … }: Object)` cast to a plain object literal in 182, and removed 19 scattered param/return annotations in 12. Applied via `flow-remove-types` (`pretty: true`) on the `<script>` block, gated to only touch files that actually contained Flow.

**Why — (A) nothing of value to convert.**
The cast is a placeholder, not a type — `Object` is Flow's `any`, used only to stop `all=true` from typechecking Vue 2 Options API components it can't model.
Evidence: 184 of 212 Flow lines in `.vue` are the single line `}: Object)`; 4 files already dropped the cast and work fine; annotation coverage is 19 of 1,148 methods (1.7%). No coherent type layer exists to lose. `ChatMain.vue`'s 4 useful annotations (`'up' | 'down'` unions, `SPMessage`) are dropped too — recoverable from git.

**Why — (B) SFC typing is deferred to the Vue 3 migration.**
Vue SFCs are deliberately left as plain, untyped JavaScript rather than moved to `<script lang="ts">`. Vue 2.6 has no `defineComponent`, so the Options API gets no meaningful inference — any typing added now would be superficial, and a Vue 3 migration is planned as the next piece of work, which would throw it away. Typing SFCs is therefore **out of scope for the Flow → TypeScript migration entirely** and belongs to the future Vue 3 effort, where `defineComponent` makes it worthwhile.

**Not touched:** the 4 already-cast-free files (`ViewArea`, `ExportPaymentsModal`, `PaymentNextDistributionPill`, `SendThankYouModal`) keep their `export default ({ … })` parens — they had no Flow, so normalizing them was out of scope. The 2 Flow `.vue` files under `historical/` are left as-is (dead code, `.flowconfig`-ignored, never an esbuild entry point).

**Follow-on — DONE:**
Removed `flowRemoveTypes` from `vue-plugin.js` (import, `flowtype` option, jsdoc, and the strip call), dropped `flowtype: flowRemoveTypesPluginOptions` from `vuePluginOptions` in `Gruntfile.js`, and deleted the now-dead `flow:vue` npm script. `flowRemoveTypesPluginOptions` itself stays — the `.js` esbuild plugin still needs it for the remaining 103 Flow files.

**Side effect — 2 latent bugs surfaced and fixed.** `eslint-plugin-vue` only recognizes a component when `export default` is a bare object, so the cast had been silently disabling all `vue/*` rules across 182 components. With it gone, two real bugs appeared (confirmed absent on the pre-change files, so not regressions):
- `UsersSelector.vue` — `userIDs: { type: Array, default: [] }` shared one array across all instances. Now `default: () => []`.
- `InvitationLinkModal.vue` — computed `link()` fell through with no return. Now explicit `return undefined`, matching its sibling computed.

**Verified:** 0 residual Flow in `frontend/` `.vue` · `eslint` clean · `flow check` 0 errors · `NODE_ENV=production grunt build` succeeds · `grunt test:unit` 99 passing · Cypress E2E green · contract hashes in `manifests.json` unchanged.

Diff: 187 files, +392/−405.

### 003 — Spec: scope parity with Flow made explicit

**Status:** DONE

Spec-only change, no code. Added the parity principle above as a lead section in the spec, with a one-to-one `.flowconfig` `[ignore]` → `tsconfig` `exclude` mapping table.

Re-measured the `.js` scope while doing it (full repo sweep, `flow-remove-types` with `all: true`) — 111 files with Flow syntax, of which 6 are in `historical/` and out of scope, leaving **105**. Split: **99 Flow-checked** (convert to TS) and **6 Flow-ignored but still built** (strip syntax only — `Gruntfile.js`, `service-worker.js`, `flowTyper.js`, `distribution.test.js`, `refcount-fuzzer.js`, `test/backend.test.js`).

**`historical/` is out of scope entirely and excluded from every count in the spec** — Flow-ignored *and* unreachable from any esbuild entry, so nothing parses it and its 8 Flow files (6 `.js`, 2 `.vue`) stay untouched, Flow syntax intact. The operative rule: a Flow-ignored file only gets edited if something still builds it.

Two open questions closed by the principle: `historical/` as above, and `flowTyper.js` is not to be typechecked (also Flow-ignored) — its remaining question is only whether to strip in place or rename to an unchecked `.ts`.

Two nuances recorded, both easy to get backwards:
- **Flow-ignored ≠ untouched by the build.** `[ignore]` suppresses typechecking only; esbuild and Babel still parse those files, so their Flow syntax must still go once `flow-remove-types` and `@babel/preset-flow` are removed.
- **Flow-ignored ≠ unedited.** `Gruntfile.js` is Flow-ignored *and* the most-edited file in the toolchain swap. Config edits are expected; typechecking it is not.

Corrections while verifying: (a) the spec claimed `Gruntfile.js` carries a `@flow` pragma — it does not, and **no file in the repo does**; the only `@flow` text is a comment at `Gruntfile.js:216` about `flow-remove-types`' `all` option. (b) 6 of the 22 `.flowconfig` `[ignore]` entries are stale (`Gruntfile.dashboard.js`, `backend/dashboard/`, `shared/multiformats/`, `shared/blake2bstream.js`, `frontend/utils/vuexQueue.js`, `ignored/` — `shared/` and `backend/` no longer exist) and 2 more are redundant with `.*/test/.*`. They should not be transcribed into `tsconfig.json`.

### 004 — Implementation plan written

**Status:** DONE

[`TYPESCRIPT-MIGRATION-PLAN.md`](TYPESCRIPT-MIGRATION-PLAN.md) — 11 steps, single PR, each ending green. Records the six Open Question decisions from the spec (permissive start, staged single PR, ESLint upgrade, `flowTyper.js` → unchecked `.ts`, ambient `@chelonia/*` stubs, no re-pinning).

Key finding that shaped the order: `flow-remove-types-plugin.js:14` filters `/\.js$/`, so `.ts` files bypass it and hit esbuild's native TS loader — **Flow and TypeScript coexist with no extra config**. That allows file-by-file conversion with Flow tooling live, and Flow removal last (Step 9) instead of up front.

Second ordering call: the ESLint upgrade goes **last** (Step 10), after the Flow plugins are deleted — otherwise it would need an `eslint-plugin-flowtype` build compatible with ESLint 8, for tooling about to be removed. Target is ESLint **8.57.1**, not 9: it satisfies `@typescript-eslint` v8's floor while keeping the `package.json` `eslintConfig` block working (ESLint 9 requires flat config).

### 005 — Plan re-verified against master @ `37bc114e9` (v2.9.0)

**Status:** DONE

Plan-only change, no code. Re-measured every count, version, and line reference in [`TYPESCRIPT-MIGRATION-PLAN.md`](TYPESCRIPT-MIGRATION-PLAN.md) after the v2.9.0 merges. Details and rationale live in the plan; this is the summary.

**Scope:** 108 in-scope files — **101** Flow-checked `.js` to convert, 6 strip-only, 1 `.js.flow` stub. v2.9.0 added 2 Flow files (`utils/markdown-parsers.js` → Step 4, `chatroom/voice-recording/voice-recording-utils.js` → Step 8); 99 → 101. No Flow returned to `.vue`. Fixed a double-count: `notifications/types.flow.js` was in both Step 2 and Step 6, so Step 6 is 23.

**Three findings that change the plan:**
- **`@chelonia/*` ship real declarations** (all but `cli`, which `frontend/` never imports) — the ambient-stubs decision is reversed. Forces `moduleResolution: "bundler"` in Step 1, since 11 of 15 specifiers are subpaths typed only via the `exports` map. Makes Steps 4–8 harder: stubs would have degraded that surface to `any`.
- **`@babel/register` needs `extensions: ['.js', '.ts']`** (`mocha-helper.js:8`) — the preset alone won't load `.ts`. Also `exec:test`'s glob is `*.test.js` only, so a renamed test file drops its suite silently; test files stay `.js` this PR.
- **New Step 3a — 4 hardcoded `.js` paths in `Gruntfile.js`.** Two entry points to update with their renames (`:677`, `:663`); two never to rename (`:77`, and `external: ['@common/common.js']` at `:684` — renaming it would move contract hashes from a different wave).

**Struck:** the "add `.ts` to esbuild `resolveExtensions`" bullet — no such option in `Gruntfile.js`, and the default already has `.ts`. The real mechanism is the reverse: `alias-plugin.js` returns paths verbatim, so aliased imports get no extension inference and must be edited with their rename (now a sequencing constraint).

**Also:** `typescript` isn't installed (Step 1 adds it); ESLint globs live in 3 places; dropping Flow from ESLint is 3 `eslintConfig` edits; Step 5 must fix `flowTyper.js`'s `eslintIgnore` path.

**Verified unchanged:** the `/\.js$/` filter at `flow-remove-types-plugin.js:14`, all Gruntfile line refs, the `.flowconfig` 14/6/2 split, ESLint versions. Step 9's CI claim is now confirmed, not assumed: `ci-test:unit` → `build` → `lintTasks`.

### 006 — Step 0: baseline and regression harness

**Status:** DONE

**Added:** `test/flowTyper-equivalence.test.js` (79 tests) and `scripts/check-residual-flow.js`. `.baseline/` holds the pre-migration test output and is gitignored.

**Baseline:** unit **99 passing, 0 failing** before this step (178 with the new 79). Cypress **163 tests: 153 passing, 0 failing, 10 pending** across 13 specs (22m13s) — the 10 pending are pre-existing skips (`group-settings` 6, `group-chat` 2, `group-paying` 1, `notifications` 1) and must stay skipped, not silently drop out. Build + `chelDeploy` leave `manifests.json` byte-identical — the contract-hash invariant for Step 5.

**The harness has teeth — verified by mutation, not assumed.** Breaking `objectOf`'s `.name` dispatch to an exact match failed 1 test; making `maybe` anonymous failed 3, covering both the name itself and the resulting behaviour change. `flowTyper.js` restored clean after each.

**Quirks locked in as-is** (observed behaviour, not intended): `isNil` is `=== null` only; `numberRange.type` is a string where every other combinator uses a function, so `getType` ignores it; `objectOf`'s unknown-property message says "missing"; `getType(optional(x))` throws without an options argument; `maybe`'s primitive check tests the *name*, so `?(nil)` and `?(void)` get parenthesised.

**Scope correction — the strip-only set is 3 files, not 6.** `flow-remove-types` strips the Flow pragma out of *comments*, so a file merely mentioning it registers as containing Flow. `Gruntfile.js` (prose comment at `:216`) and `scripts/refcount-fuzzer.js` (`/* @noflow */` at `:1`) contain **no Flow syntax** — both are comment deletions. Real syntax remains only in `service-worker.js` (7 lines), `test/backend.test.js` (2) and `distribution.test.js` (1). Plan Step 9 updated; its gate is now `check-residual-flow.js --gate`.

### 007 — Step 1: tsconfig.json and a non-blocking typecheck

**Status:** DONE

**Added:** `tsconfig.json`, `npm run typecheck` (`tsc --noEmit`, exits 0), `typescript@6.0.3` pinned exact, and a seeded `frontend/declarations.d.ts`. `npm run typecheck` clean · `grunt build` green (eslint + flow + puglint + stylelint) · `manifests.json` unchanged.

**TypeScript 6.0.3, not 7.** Latest is 7.0.2, but `@typescript-eslint` (still v8, 8.69.0) peers `typescript: >=4.8.4 <6.1.0`, so TS 7 would strand Step 10's lint stack. 6.0.3 is the newest version the planned stack accepts. Its eslint peer `^8.57.0 || ^9 || ^10` also re-confirms the ESLint 8.57.1 target.

**`checkJs: false` does not silence Flow syntax — it suppresses *semantic* errors, not *syntactic* ones.** Rooting the 126 Flow-annotated `.js` files produced thousands of unsuppressable TS8010/TS1005 parse errors. So `include` is **`frontend/**/*.ts` only**: `.js` enters the program solely when a `.ts` imports it, which leaf-first ordering keeps rare. Step 1's "typecheck exits 0 trivially" holds, but not for the reason the plan assumed.

**Corollary, proven by probe:** a `.ts` importing an unconverted Flow `.js` *does* surface that file's parse errors transitively — importing `@common/common.js` lit up `translations.js`, `errors.js`, `stringTemplate.js`.

**Two TS 6 breaks fixed:** `baseUrl` is deprecated (stops working in 7) — dropped, `paths` now resolve relative to the config. An empty program is a hard error (TS18003), which is why `declarations.d.ts` is seeded now rather than in Step 2.

**`"types": []`.** TypeScript would otherwise auto-include all 19 transitive `node_modules/@types/*` packages as globals, leaking Node types into browser code. Flow drew ambient types only from `[libs]`; this restores that.

**Verified by probe, then deleted:** all 11 aliases and the `@chelonia/*` subpath types resolve — zero TS2307. That confirms the Step 1 `moduleResolution: "bundler"` and Step 2 "no stubs" decisions empirically.

**Exclude list:** 14 live `.flowconfig` entries transcribed and annotated line-by-line; the 6 stale and 2 redundant re-verified as missing from the tree. Arithmetic checks out — 135 `.js` under `frontend/`, minus 3 named exclusions and 6 `*.test.js`, = the 126 the program would otherwise root.

**Bug fixed in the Step 0 checker.** It scanned `.ts` too — but Flow and TypeScript annotations are syntactically identical, so `flow-remove-types` strips a `.ts` file just as happily. Every converted file would have counted as "still containing Flow" and the Step 9 gate could never have reached zero. Now scans `.js` / `.vue` / `.js.flow` only; count back to 108.

**Note — unrelated failure:** `avatar-caching.test.js` now fails (upload 500) against the long-running dev backend from Step 0. Reproduced with all Step 1 changes removed, so it is stale server state, not a regression. Needs a backend restart (`kill 34780`) to reconfirm the 178/178 baseline.

### 008 — Step 2: ambient declarations

**Status:** DONE

**Added:** `frontend/declarations.d.ts` (globals) and `frontend/shims.d.ts` (`*.vue` / `*.svg` / `*.scss`). Typecheck clean · Flow still green · `grunt build` green · eslint 0 · residual Flow unchanged at 108.

**The 311-line Flow libdef needs 2 declarations in TypeScript.** Of its 88 `declare module` stubs: 41 resolve on their own (probed all 42 bare specifiers used under `frontend/` — zero TS2307), 32 are dead leftovers from the in-repo backend era, 15 are impossible. Globals: `crypto` is better served by `lib.dom.d.ts`; `logger` and `Compartment` have no consumers left. Kept: `fetchServerTime` and `process`, the latter left `any` for parity — typing it as esbuild's 11 defined keys would catch a mistyped key (a ReferenceError, not `undefined`, since `define` substitutes textually) and is green today, but that's a coverage expansion. Deferred to the strictness pass.

**`paths` beats an ambient `declare module` for the same specifier.** Declaring `~/…/flowTyper.js` as `any` left all 387 of its Flow parse errors in place — TypeScript opens the real file regardless. Flow `.js` is kept out of the program by conversion order, not by stubs. This is why the local-path stubs can't be carried over.

**RULES section added to the plan** — (1) the phrase "load-bearing" is banned in all documentation, (2) Flow → TypeScript translations mirror Flow exactly, with no narrowing or additions, even where the Flow type is provably wrong. Applied retroactively: `process` is back to `any`, and `fetchServerTime` back to `fallback?: boolean | null` (the exact mirror of `?boolean`) despite the implementation being `async (fallback = true)`, where `null` is falsy and throws rather than meaning "unspecified". Both discrepancies recorded as comments for the later strictness pass.

**`notifications/types.flow.js` deferred to Step 6.** Renaming it to `.ts` breaks Flow for its 4 `import type` consumers (4 `cannot-resolve-module`); attempted and reverted. No `.ts` needs it yet. Step 6 is now 24 files, Steps 4–8 total 100.

### 009 — Step 3 + 3a: the build learns `.ts`

**Status:** DONE

**Changed:** `@babel/preset-typescript` installed and added to `.babelrc`; `@babel/register` given `extensions: [… , '.ts']`; three ESLint globs widened to `{js,ts,vue}`; dev watch glob widened; `.flowconfig` gains a `.ts` extension mapper pointing at the new `frontend/tsModuleStub.js.flow`. No source file converted.

**Flow, not esbuild, was the blocker.** A Flow-checked `.js` importing a `.ts` fails `cannot-resolve-module`, and `npm run flow` is a CI step — so Step 4's first rename was unrunnable. Fixed with an extension mapper to an `any` stub, the same shape `.flowconfig` already uses for `.vue`/`.svg`. **Value imports resolve; `import type` does not** (`[value-as-type]`), so any module whose types Flow files consume must convert in the same commit as those consumers. That generalises the `types.flow.js` deferral from 008 into a rule for every wave.

**ESLint needed two `overrides` blocks, not just a wider glob.** `@babel/eslint-parser` parses `.ts` but does no TS scope analysis, so `no-undef` fired on every type name — Flow files escape this only via `flowtype/define-flow-type`, which has no TS equivalent before Step 10. `no-undef` off for `**/*.ts` (`tsc` reports the same as TS2304). And `**/*.ts` matches `.d.ts`, so the glob dragged in Step 2's declarations and failed the build on `no-var` / `no-unused-vars` / `no-redeclare`; those three are off for `**/*.d.ts` rather than ignoring the files, since they are hand-written.

**Babel needed no `overrides`.** The plan assumed presets are extension-scoped; `preset-flow` is configured `{ all: true }` and is not. Verified they coexist anyway — Flow-only and TS-only syntax each compile from their own extension. Installing the preset bumped six `@babel/helper-*` packages, which touches Mocha and ESLint only, never the esbuild path.

**Contract bundles byte-for-byte identical** to a stashed build from `HEAD` — all 6 `dist/contracts/*.js` and 3 manifests. `tsc` 0 · Flow green · eslint 0 · `grunt build` 0 · 178 passing (180 with probes) · `grunt dev` hot reload confirmed live on a `.ts` edit. Residual Flow 108 → **109**: the new stub, which Step 9 deletes.

**3a:** the four hardcoded `Gruntfile.js` paths re-verified at `:77`, `:663`, `:677`, `:684`. Two references that look like they belong there do not — `service-worker.js:119`'s `/assets/js/sw-primary.js` and `index.html:43`'s `/assets/js/main.js` name build *outputs*, and esbuild emits `.js` for a `.ts` entry point (verified), so Steps 5 and 7 leave them correct.

**Resolved:** the orphaned `chel` server from 006/007 is gone; ports 8000/8888 are free and the 178/178 baseline is reconfirmed clean.

---

### 010 — Step 4: first conversion wave (`common` + `utils`)

**Status:** DONE

**Changed:** 12 files renamed `.js` → `.ts` (`common/{errors,stringTemplate,translations}`, `utils/{CircularList,constants,faviconBadge,image,isPwa,lazyLoadedView,markdown-parsers,promiseWithResolvers,trapFocus}`) plus specifier updates in 43 importers. `tsc` 0 · eslint 0 · Flow green · `grunt build` 0 · 178 passing · residual Flow 109 → **97**.

**This wave already reached the contract bundles.** The non-slim contract entry points bundle `@common/common.js`, which re-exports `translations`, `errors` and `stringTemplate` — only `contractsSlim` marks it external. `manifests.json` came out byte-identical, so the TS loader and `flow-remove-types` emit the same bytes here; that is measured, not guaranteed, so the check belongs in every wave that touches a contract-reachable module, not only Step 5.

**`common.js` keeps its name but not its specifiers.** Step 3a's "never rename" still holds — the `external` string match and the hashes depend on it — but its three `export * from './*.js'` lines had to become `.ts`, and Flow resolves a re-export through the Step 3 stub the same way it resolves an import.

**Extensionless aliased imports survive a rename untouched.** `alias-plugin.js` returns an extensionless path and esbuild infers the extension, so `'@utils/constants'` found `.ts` with no edit — confirmed in the built chunk. Grep for them to know they exist; don't change them.

**`typeof Error` is the first RULES 3 exemption** (added to the plan this step: mirror only when the mirror compiles). TS's `ErrorConstructor` requires the `Error.isError` static that `ChelErrorGenerator` doesn't return, so TS2741 where Flow was fine — and mirroring it costs a `@ts-expect-error` per export. Annotation dropped instead; the inferred constructor type is assignable to `Error` and keeps `.message`, `instanceof` and `throw`. Step 5's four cases in `chatroom.js` and `group.js` go the same way.

**Four failures were TypeScript checking what Flow only inferred**, none a translation: `let options = {}` then `options.width`; `function f ({a, b} = {})`; un-parameterized `new Promise` inferring `Promise<unknown>`; `Array.from(any)` yielding `unknown[]`. All fixed with `any` so coverage stays exactly where Flow had it. Also confirmed: a `| void` parameter becomes `?`, since TS otherwise demands the argument and `L()` is called with one everywhere.

**Step 3's Mocha hook got its first real use** — `stringTemplate.test.js` is a `.js` test importing a `.ts` module, and it passes.

### 011 — Step 5: contract wave (`model/contracts/**`)

**Status:** DONE

**Changed:** 17 files renamed `.js` → `.ts` plus `misc/flowTyper.ts`, and 132 specifiers across 77 importers. Gruntfile entry points, `tsconfig` `exclude`, `eslintIgnore` and `.flowconfig` `[ignore]` all repointed at `flowTyper.ts`. `tsc` 0 · eslint 0 · Flow green · prod `grunt build` 0 · 178 passing incl. the Step 0 `flowTyper` harness. `contracts/` and `chelonia.json` untouched; no `grunt pin`. 88 → **71** left.

**The contract-hash invariant was unverifiable and is now restated.** `manifests.json` is gitignored, so the `git diff` check used through Step 4 could never fail. Baseline properly: two consecutive prod builds byte-identical, then copy-rebuild-diff.

**The hashes move, and it's only a comment.** All three moved. Cause is esbuild's `// <path>` source banner, which a rename rewrites. Rebuilt both trees: all six bundles identical in size and byte-for-byte identical with banners normalised (`group.js` 138092 both ways). Emitted contract code is unchanged. Step 4 moved them too. New invariant: code identical modulo banners, `contracts/**` no git diff.

**`flowTyper`'s exports are annotated `any`.** Flow `[ignore]`s the file, so its exports were `any` and the contracts' call sites into it were never checked. `@ts-nocheck` doesn't reproduce that — TS still infers the real signatures — which surfaced 12 errors in `group`/`identity`/`payments`. Fixing those would have meant editing frozen contract source to satisfy checking Flow never did.

**`@ts-nocheck` doesn't stop syntax errors**, so `flowTyper` needed a genuine syntax translation (110 of the first 114 errors): `<T: B>` → `<T extends B>`, named function-type params, `(x: T)` → `x as T`, `*` → `any`. Runtime untouched — `.name`-survival tests still pass.

**`shared/constants.js` stays `.js`** — no Flow syntax, so parity excludes it, and it's the most-imported file in the wave (70+ specifiers).

**Specifiers are rewritten by resolution, not pattern-matching.** A hand-written pattern pass silently missed `./mincome-proportional.js`; the resolver pass caught all 132 and left `gi.contracts/*` selector strings alone.

### 012 — Step 6: model wave (`frontend/model/**`, non-contract)

**Status:** DONE

**Changed:** 24 files renamed `.js` → `.ts` (root 10, `chatroom` 3, `notifications` 10 incl. `types.flow.js` → `types.ts`, `settings` 1), 61 specifiers across 34 files, and 2 dead links in `docs/src/Information-Flow.md` (one left over from Step 5). `tsc` 0 · eslint 0 · Flow green · prod `grunt build` 0 · 178 passing. 71 → **47** left.

**No contract bundle moved.** Nothing in this wave is reachable from a contract: all six bundles and `manifests.json` are byte-identical, raw. Per-file emit check (Flow build vs TS loader): 22 of 24 identical, 2 differ only in comments. `main.js`/`sw-primary.js` differ only in chunk hashes and minified identifier names.

**Two RULES 3 exemptions:** `createLogger`'s async `Object` return (TS1064, now `Promise<any>`; dropping it would expose an inferred shape to callers) and `makeNotification`'s `icon?: string` (TS18047, now `any`).

**`@babel/eslint-parser` doesn't count type-only uses**, so the mirrored `import type`s fail `no-unused-vars`. 4 per-site disables, not an override: `tsc` doesn't report unused locals, so an override would lose coverage. Step 10 removes them.

**4 `@ts-expect-error` for lib.dom gaps** in `nativeNotification.ts`, as in `isPwa.ts`. Step 7 has ~17 more service-worker-global sites.

**Everything else is `any`, as Step 4 prescribes**, except `new Promise<void>` where `resolve()` takes no argument (TS2794).

### 013 — Step 7: controller wave (`frontend/controller/**`)

**Status:** DONE

**Changed:** 23 files renamed `.js` → `.ts` — the planned 20, **plus 3 pulled forward from Step 8** — and 79 specifiers across 60 importers, incl. `Gruntfile.js:663` (the SW entry point). `tsc` 0 · eslint 0 · Flow green · prod `grunt build` 0 · 178 passing. 47 → **24** left. Contract bundles, `manifests.json`, `contracts/**` and `chelonia.json` all untouched.

**A `.ts` file importing a still-Flow `.js` one is a hard error, and Step 7 is where that first bites.** `tsconfig.json`'s `include` comment assumed waves stay leaf-first, but controller imports *upward* into Step 8: `app/group` → `@view-utils/{misc,allowedUrls}`, and `push`/`sw-primary` → `setupChelonia`. Those three then parse as TS, and Flow syntax is an unsuppressable **syntax** error (40 of them). Neither an ambient `declare module` nor a `tsconfig` `exclude` entry stops it — both tested, both still resolve to the real file. So the three convert here. Their own closure adds nothing further. **Step 8 should expect the reverse direction to be clean, since its imports are now all `.ts`.**

**SW globals split: `WorkerGlobalScope` is global, `self` can't be.** `WorkerGlobalScope` is declared nowhere (it's `lib.webworker`), so one `declare const WorkerGlobalScope: any` in `declarations.d.ts` covers all three sites. `self` is declared by lib.dom, which wins — a global override is *silently ignored*, not rejected, and all 43 `self` errors return; only module scope shadows it, so `push.ts`/`sw-primary.ts`/`nativeNotification.ts` keep their own. Together **44 errors** cleared with no `@ts-expect-error`, because untyping `self` also untypes every `self.addEventListener` handler argument. Controlled Flow probe confirms parity: `self` was `any`, `WorkerGlobalScope` unchecked, handler args `any` — only the control errored.

**`@chelonia/crypto`'s `Key` was real to Flow; `@chelonia/lib`'s `SPKey` was not.** Flow's own libdef (`declarations.js:83`) declared a loose 3-field `Key` but `module.exports: any`, so values were unchecked. Probe: `const k: Key = 'str'` errors, `const s: SPKey = 12345` does not. Bindings whose real declarations added checking Flow never did are annotated `any` (Step 6's `templates.ts` rule), error-driven rather than swept.

**`sbp(...invocation)` needs a tuple.** `@sbp/sbp` ships `sbp(selector: string, ...data: unknown[])`; Flow saw `any`. Spreading a plain array is TS2556, so the two `invocation` literals are `[string, ...any[]]` and the two `deserializer(...)` spreads are cast.

**Per-file emit: 22 of 23 code-identical**, the rest differing only in deleted `$FlowFixMe` comments esbuild keeps inside expressions. The exception is real: esbuild's TS loader **drops `import scrypt from 'scrypt-async'`** from `e2e/keys.ts` as unused, where the JS loader kept it. Harmless only because nothing imports `frontend/controller/e2e/*` and `gi.e2e/keys` appears nowhere in `dist/` — it is dead code. **Step 8 must check this per file, not assume it.**

**Two harness traps, both of which silently reported success.** `flow-remove-types`' CLI writes nothing for an unrecognised input extension, and esbuild derives the default-export variable name from the input *basename* — so a comparison keyed on basenames collides (`actions/chatroom` vs `app/chatroom`, and 4 more) and reports phantom diffs. Use the Node API and key scratch dirs on the full path.

### 014 — Step 7a: global `Fn`

**Status:** DONE

**Changed:** `type Fn = (...args: any[]) => any` added to `declarations.d.ts`, applied at **17 sites across 9 files** — the `any`s that were Flow `Function`. `tsc` 0 · eslint 0 · Flow green · prod `grunt build` 0 · 178 passing. Contract bundles and manifests byte-identical; `contracts/**` and `chelonia.json` untouched.

**A deliberate narrowing, which is why it is its own commit.** Flow's `Function` is a spelling of `any`, so `Function` → `any` was the exact mirror and this is a RULES 2 departure — taken to recover the intent the original authors encoded. Not TypeScript's `Function`, which has no call signature and is banned by `@typescript-eslint/no-unsafe-function-type`.

**`tsc` surfaced nothing, and that is the expected result, not a skipped check.** With `strict`/`noImplicitAny` off, these values all arrive from `any`, which assigns into `Fn` freely; the narrowing only bites where such a value is *used* as a non-callable. Verified live instead: a throwaway `.ts` resolved `Fn` with no import and rejected `= 'not a function'` (TS2322), control line erroring alongside. The real payoff is the two `string | Function` unions, which had collapsed to `any` and now discriminate.

**The plan's inventory was one site short.** `periodicNotifications.ts:94` is a *cast*, `(any | string[])[]`, not an annotation — which is exactly why the recovery must be `git grep -n "Function" 13f1b9c29a -- frontend` and not a read-through: post-conversion a `Function`-derived `any` is indistinguishable from an `Object`-derived one.

**Only one call site passes the callback arm** of `humanError` — `gi.actions/group/updateAllVotingRules`. The `actions/utils.ts` comment saying the union checked nothing is deleted rather than rewritten: Step 7 added it, the migration base had nothing there, and `string | Fn` now states the same fact.

### 015 — Step 8: `frontend/views/**`

**Status:** DONE

**Changed:** 24 files converted and renamed; 79 specifiers across 63 importers, 54 of them `.vue`. `tsc` 0 · eslint 0 · Flow green · prod `grunt build` 0 · 178 passing. Contract bundles and `manifests.json` byte-identical raw; `contracts/**` and `chelonia.json` untouched. No build config changed — nothing in this wave is an entry point or a hardcoded path.

**Steps 4-8 done: 100 Flow-checked files, 24 → 0 left.** What still holds Flow syntax is Step 9's strip-only set — `controller/service-worker.js`, `distribution.test.js` — plus `declarations.js` and the two `.js.flow` stubs.

**Flow class property declarations are not erased, so the plain TS spelling is the emit-identical one.** `flow-remove-types` blanks `index: number;` to a bare class field and esbuild emits `__publicField(this, "index")`; plain `index: number` in `.ts` reproduces that exactly, while `declare index: number` would have erased a field the build has always defined. The opposite of the expectation, settled by compiling `AnimationMixins.ts`'s `Confetti` all three ways rather than reasoning about `useDefineForClassFields`.

**Per-file emit: 24 of 24 code-identical**, one deleted `$FlowFixMe` comment apart. No import elided.

**RULES 3 exemption — `confettiNames`.** Its `Array<"confetii-triangle" | …>` annotation is TS2322 against `Object.keys()`'s `string[]`. Flow accepted it, confirmed by a `const control: string = 42` line in that same file erroring alone — the check that separates "Flow accepted this" from "Flow never looked", where only the first is an exemption. Annotation dropped rather than cast: it gave callers a union, not `any`, and the one consumer's parameter is unannotated, so it checked nothing where it could have.

**`marked` was `declare module.exports: any` to Flow**, so `marked.parse()`'s real `string | Promise<string>` made two `.replace()` calls TS2339; the binding is `any`, restoring Flow's coverage. Last of these — the rest of `declarations.js` goes in Step 9.

---

### 016 — Step 9: remove Flow

**Status:** DONE

**Changed:** 3 files stripped of Flow syntax **and renamed to `.ts`** (`controller/service-worker` 7 annotations, `test/backend.test` 2 signatures, `distribution.test` 1) and 2 comment-only hits cleared (`Gruntfile.js:216` prose, `refcount-fuzzer.js:1` pragma). Deleted `.flowconfig`, `declarations.js`, both `.js.flow` stubs, the esbuild plugin, and `scripts/check-residual-flow.js`. `exec:flow` → `exec:typecheck` in `lintTasks`; `flow stop` and the plugin's watch-cache branch gone; `@babel/preset-flow` out of `.babelrc`; `flow-bin` / `flow-remove-types` / `@babel/preset-flow` out of `package.json` along with the `flow` script. `tsc` 0 · eslint 0 · stylelint 0 · puglint 0 · prod `grunt build` 0 · 178 passing · `grunt dev` starts clean and hot-reloads a `.js` edit.

**The renamed 3 keep their annotations, mirrored — the strip was undone.** Stripping was correct only while they were staying `.js`, where an annotation is a syntax error. Once they became `.ts` that reason expired, and RULES 2 applies like anywhere else. All 10 annotations are back: 7 in `service-worker.ts` (`Object` → `any`, `?ServiceWorker` → `ServiceWorker | null | undefined`, the Flow cast → `as any`), 2 return types in `backend.test.ts`, 1 parameter type in `distribution.test.ts`. Two needed RULES 3, both confirmed by compiling the candidates rather than guessing: bare `: Promise` is TS2314 in TypeScript, so it is `Promise<any>` — Flow's bare `Promise` meant `Promise<any>`, so that is the mirror, not a widening; and `{ adjusted }: { adjusted: boolean } = {}` is TS2741 — the `= {}` default cannot satisfy a required property — so it is `{ adjusted?: boolean }`, which is what the default always meant. Verified by lifting the `**/*.test.ts` exclusion and typechecking: the parameter resolves clean.

**Rule applied: a file that carried type annotations is `.ts`, whether or not it is checked.** The plan's "strip-only set" would have left 3 files as `.js` with their annotations deleted — the only `.js` files in the tree that ever had them. Renaming them instead makes the extension mean one thing ("this file had types") rather than two. Being `.ts` does **not** put them in scope: all 3 stay excluded, exactly as `.flowconfig` [ignore] had them.

- `controller/service-worker.ts` carries `@ts-nocheck` as well as its `exclude` entry, following the `flowTyper.ts` precedent. `exclude` alone happens to work today — the sole importer is `frontend/main.js`, which is `.js` and never a program root, so `--listFiles` shows the file never loading — but that silently stops being true if `main.js` is ever converted. The pragma makes the exemption independent of that. Measured cost of real coverage, for whoever picks it up: **9 errors**, 4 of them the Chromium-only Periodic Background Sync API absent from TypeScript's DOM lib (an ambient declaration, not a code change), the rest `MessageEvent.data` destructured positionally.
- Both `.test.ts` files carry `// @ts-nocheck`, **for editors only** — `tsc` already skips them via the `**/*.test.ts` exclude. A language server does not honour that exclude: a file outside the project falls back to TypeScript's default options, which enable `strict` where this repo sets `strict: false`, so the editor reported 36 errors in a 58-line file that no build could ever produce. Measured both ways to confirm the cause — compiled standalone, defaults give TS18048 ×15, TS7005 ×8, TS7053 ×7, TS7034 ×3, TS7006 ×3; `--strict false` leaves only the 6 `describe`/`it` misses from `"types": []`. Editor diagnostics are empty after the pragma.
- The 2 test files needed **Mocha's glob widened** from `*.test.js` to `*.test.{js,ts}` first, or they would have dropped out of the run with nothing failing — the exact trap Step 11's "suite count matches baseline" checkbox guards. Verified after the rename: **178 passing**, and `Test group-income-distribution.js` is present in the run, so the suite is executing rather than merely absent-and-uncounted. `tsconfig` already excluded `**/*.test.ts`, and `mocha-helper.js` already registered the `.ts` extension in Step 3, so nothing else was needed.

**`historical/` is out of scope permanently, not pending.** Its 8 Flow files keep their Flow syntax and their `.js` names, preserved literally. This is a standing decision, not an unfinished edge of the migration: **do not convert them, do not strip them, do not "finish the job" later.** They are an archive of superseded implementations, and their value is being exactly what shipped at the time.

Nothing will drag them in by accident — three independent guards, none of which relied on Flow: `eslintIgnore` (`"historical/*"` in `package.json`), `tsconfig` `exclude` (`"historical"`), and Mocha's spec glob, which names `historical` in its negated group. No esbuild entry point reaches the directory either. The residual-Flow checker deleted in this step had an `--all` flag precisely to keep these out of its default count; the equivalent question now is simply "does the build touch it", and it does not.

**The gate script had to go with the tooling.** It detects Flow by running files through `flow-remove-types` and diffing, so it `require`s the package Step 9 removes. Ran it last (exit 0; only `historical/`'s 8 files remain, all deliberate), then deleted both. The build is the standing check now — esbuild parses `.js` itself and rejects a Flow annotation outright, verified: `export const f = (x: number) => x` fails with `Expected ")" but found ":"`.

**`flow-bin` is still installed, as a peer.** `eslint-plugin-flowtype-errors` peer-requires it, so npm keeps it (`"peer": true` in the lockfile) despite the direct dependency being gone. Step 10 removes that plugin and takes `flow-bin` with it — so Step 11's "no `flow-bin` anywhere" is a Step 10 checkbox.

**Bundles, before the comment sweep below:** all 6 `dist/contracts/*.js` + 3 manifests byte-identical to a Step 8 baseline; 302 of 306 files under `dist/assets/js` hash-match. The 4 that differ are `main.js`, `sw-primary.js` and their maps, differing **only** by the injected `GI_GIT_VERSION` (`-dirty`, from the baseline being built clean) — normalised, both `.js` bundles are identical. The maps genuinely shift, and that is the finding: `flow-remove-types` blanked annotations to **spaces**, preserving every column, while stripping them by hand removes the characters. `service-worker.js` is the sole changed `sourcesContent`.

**Also swept: 15 dead Flow suppression comments** across 9 files — 14 `$FlowFixMe` plus one `$FlowIgnore` a `$FlowFixMe`-only grep had missed. They suppressed nothing once Flow was gone.

**That sweep is not free, and the assumption that it would be was wrong.** `dist/contracts/*.js` is **not minified** — the bundles are ~3000 readable lines and keep their comments, which Step 7 had already recorded ("deleted `$FlowFixMe` comments esbuild keeps inside expressions"). So deleting a comment from contract source changes contract bytes, and therefore the contract CID. Measured, with the comments re-inserted and rebuilt for a true control:

- `group.js` / `group-slim.js` lose 2 lines, `chatroom.js` / `chatroom-slim.js` 1. **`identity` is unchanged.** The diffs are exactly the deleted comment lines and nothing else.
- Consequently `gi.contracts/group` and `gi.contracts/chatroom` get new CIDs; `gi.contracts/identity` keeps its own.
- `sw-primary.js` changes only where it embeds those two CIDs.
- 150 of 152 emitted JS files are byte-identical after normalising away content-hashed chunk filenames and the trailing `sourceMappingURL`. The wide churn in lazy-chunk *names* is a hash cascade off the source maps, not a code change. The 2 exceptions: `sw-primary.js` (the CIDs) and one chunk where the minifier picked `import{b,…}` over `import{b as N,…}` — alpha-equivalent.

**Nothing tracked in git moved.** `contracts/**` (the version-pinned snapshots) and `chelonia.json` are clean, and `frontend/model/contracts/manifests.json` is gitignored — a build artifact regenerated every run. A fresh build has diverged from the pinned 2.9.0 snapshots since Step 4 anyway, by the `.js` → `.ts` path banners; this adds comment lines to that same already-accepted class. Only a future `grunt pin` on a version bump makes new CIDs durable.

**`exec:typecheck` reaches CI with no workflow edit** — `ci.yml:24` → `grunt ci-test:unit` → `build` → `lintTasks`. Read, not assumed. `ci-test:cypress` still uses `build:skiplint` and still typechecks nothing, as before.

---

### 017 — Step 9a: close the coverage gap

**Status:** DONE

**Changed:** 24 `.js` → `.ts` under `frontend/` (the 23 clean ones, then `main.js`), **224 specifiers across 164 files**, one Gruntfile entry-point line, a `vuex` `paths` entry, a `Window` interface in `declarations.d.ts`, and two `tsconfig.json` options that unbreak Cypress. `tsc` 0 · eslint 0 · stylelint 0 · 178 passing · prod `grunt build` 0 · `grunt dev` starts clean and hot-reloads both a `.js` and a `.ts` edit · `contracts/**` and `chelonia.json` clean.

**`common.js` was never blocked — I had asserted it was without reading the resolver.** The thing that answers `__require("@common/common.js")` is `frontend/setupChelonia.ts:165`, our own code: `modules: { '@common/common.js': Common }`, a plain object keyed by specifier. The rename was built and proven green — 131 specifiers across 124 files, the `external` literal at `Gruntfile.js:679`, three `modules:` maps carrying both spellings, `tsc`/eslint/production build/178 tests clean, `common` still external to the slim bundles (`group-slim.js` came out 66 bytes *smaller* than the pinned 2.9.0 snapshot; inlining would have added ~15 KB). **Then reverted by decision**, on the file's own standing instruction not to be disturbed. `common.js` is byte-identical to its pre-Step-9a state. What the exercise leaves behind is the correction: it is a choice, not a blocker, and any future rename must keep the `.js` key in that map permanently for the frozen pinned snapshots.

**`checkJs` stayed off — the plan said to turn it on, and that was reconsidered on evidence.** By then the 24 renames had restored the coverage on their own, since a `.ts` file is checked whatever `checkJs` says, so the flip's entire remaining effect was **one file**: `common/common.js`. A deliberate `Math.round('a')` there is 1 error with it on, 0 with it off, nothing else moves. The costs were real: plain-JavaScript contributors would find new `.js` files typechecked by default, and `utils/blockies.js` — vendored, minified, imported by `avatar.ts` past its `exclude` entry — needed a `@ts-nocheck` pragma purely to stay out of the way. **`common/common.js` is therefore the one file Flow checked under `all=true` that TypeScript does not.** Recorded as an open parity shortfall, not as closed.

**Cypress was already broken, and two `tsconfig.json` lines fix it.** `npx cypress run` failed before any test ran, in two places: `ts-node` compiling `cypress.config.js` (TS5107 `moduleResolution=node10`, TS5011 rootDir inference) and `ts-loader` inside `@cypress/webpack-preprocessor` (TS5101 `downlevelIteration`). Cause: `typescript@6.0.3`, added in Step 1, is resolvable from the project and Cypress 13.14.2's bundled `ts-node`/`ts-loader` prefer it over their own; TS 6 turns their internal defaults into hard errors. **Not caused by Step 9a** — proved twice: it reproduces with the Step 9 `tsconfig.json` checked out, and with a spec that imports nothing and asserts `1 === 1`. Fixed with `"ignoreDeprecations": "6.0"` and `"rootDir": "/"`, both inert for our own `tsc` (`noEmit` is on). After that a probe spec importing `constants.ts` runs and passes — which also answers the open question from earlier in the step: **Cypress does compile the `.ts` specifiers Step 9a introduced** into six specs and `support/commands.js`.

**Contract CIDs move, and the plan's gate had predicted they would not.** `dist/contracts/*.js` is not minified, so esbuild's per-module path banners ship, and two are renames from this step: `// frontend/utils/events.js` → `.ts` and `// …/shared/constants.js` → `.ts`. Against a production build of the Step 9 commit in a worktree, **all six bundles are identical once those two lines are normalised and nothing else differs** — but they are real bytes, so all three contract hashes change. Same already-accepted class as Steps 4-8: 16 of the 17 banners already read `.ts`, and `constants.ts` is the last. Build the baseline in a worktree — a `dist/` left by `grunt test:unit` carries the test-only `forceDistributionDate` / `malformedMutation` actions and looks like a huge unrelated diff.

**10 errors, not the 16 the plan's prose claimed** (its own table said 5 + 5, and the table was right). `vError.ts` 5, `main.ts` 5.

**The Vue `store` overload was module resolution, not a typing gap.** vuex 3.6.0 predates the `types` export condition, so its `exports` map has `require` and `import` only and `moduleResolution: "bundler"` never finds `types/index.d.ts` — `vuex` has been an untyped module this whole time, which is why `types/vue.d.ts` never augmented `store` onto `ComponentOptions`. One `paths` entry fixes it, adds no errors, and esbuild ignores it: bundling `import { mapGetters } from 'vuex'` inside the project still pulls the 35 KB runtime, not the `.d.ts`.

**`$v` got a local cast, not a global augmentation.** Vuelidate is never `Vue.use`d here — every consumer imports `validationMixin` itself — so declaring `$v` on `vue/types/vue` would claim it exists on every component. `vError.ts` casts `vnode.context` in each hook, which matches the runtime contract the file already states two lines down (`v-error: vuelidate doesn't have validation for …`).

**`reducedMotionQuery` errored on Flow's unsealed `{}`.** `window.matchMedia(…) || {}` then reads `.matches`; Flow lets an empty object literal answer any property read with `any`, TypeScript does not. Annotated `{ matches?: boolean }` — the only member read, and both operands satisfy it.

**`exclude` will not hold `blockies.js` if `checkJs` is ever turned on**, the same trap `service-worker.ts` hit in Step 9: `avatar.ts` imports it, and an imported file is in the program whatever `exclude` says. It would need a `@ts-nocheck` pragma as well, the arrangement `flowTyper.ts` and `service-worker.ts` already use. Noted for whoever revisits the setting; no change made.

**`main.ts` needed one Gruntfile edit, not three.** `:77` is the entry. `:191` watches the *output* path and `index.html:43` loads it, and esbuild still emits `dist/assets/js/main.js` from a `.ts` entry — checked, not assumed, so both were left alone.

**Seven stale prose references, none of them specifiers**, updated by hand after the resolver-based rewrite: four comments naming `constants.js` / `mainNotificationsMixin.js`, a `console.warn` in `avatar.ts` that names its own file, an SCSS comment, and `docs/src/Style-Guide.md`.

---

## Open items

- **Deduplicate the plan against this file — docs-only, after every step lands.** Each "What Step N turned up" section repeats its PROGRESS entry almost whole: Step 4 has five findings and all five are in both, and Steps 5-7a are the same. The split that was intended: the plan keeps only what changes a *later* step's execution (the "Step 5 hits this four more times — `chatroom.js:39,40`, `group.js:369,370`" kind of pointer), PROGRESS keeps the full finding and the gate numbers. Doing it at the end rather than per-step avoids rewriting the same sections repeatedly. Its own commit — no source files change.
- Flow is gone (Steps 4-9). Left: Step 10 (ESLint 8 + `@typescript-eslint`, which also removes `eslint-plugin-flowtype`, `eslint-plugin-flowtype-errors` and the peer-installed `flow-bin`) and Step 11 (verification checklist).
- **Coverage gap 24/25 closed in Step 9a. `common/common.js` is the one still open, by decision, not by blocker.** The conversion was built and proven green, then reverted on the file's own standing instruction. It is therefore the single file Flow checked under `all=true` that TypeScript does not — `checkJs` stays `false`, which costs nothing else, since the rest of `frontend/`'s `.js` is `blockies.js` and five `*.test.js`, the 6 Flow ignored too. **If it is ever renamed:** `Gruntfile.js:679` matches it as a literal string in the slim-contract `external`, and `frontend/setupChelonia.ts` must keep a `'@common/common.js'` key permanently, because the frozen pinned snapshots under `contracts/` require that spelling and are still served.
- **`AGENTS.md` still documents Flow, and it is the file agents read first.** Its "Linting & Type Checking" block lists `npm run flow # Run Flow type checker` and its CI section lists `npm run flow` as step 2 — both gone since Step 9, which replaced them with `exec:typecheck`. The same block lists `npm run lint`, which has never existed in this repo; the script is `npm run eslint`. Out of scope for Step 9a's diff, and a one-commit docs fix whenever it is wanted.
- `flowTyper.ts`: converted in Step 5, still `@ts-nocheck` and still in `eslintIgnore` (parity — Flow reported **82** errors on it when un-ignored, 76 in the file itself).
- **Its line-26 TODO ("remove from eslintIgnore and fix errors") is now cheap — expect it to be asked for.** Measured: 11 eslint errors. 9 are `indent`, auto-fixable and provably free (esbuild reformats; rebuilt with them fixed, all six contract bundles byte-identical). 2 are `no-prototype-builtins`, false positives — both are `o.hasOwnProperty(k)` where `o` is `Object.assign({}, value)`, always plain-prototype — but the fix changes emitted contract bytes, so it belongs in its own PR, not one whose diff is verified by "identical modulo path banners". Note `grunt build` runs eslint as a task, so un-ignoring fails the build until those 2 are fixed. Typechecking it is a separate and bigger question: 8 in-file errors, plus ~12 in contract source once its exports stop being `any`.
- **Deferred to the Vue 3 migration:** typing the 186 `.vue` SFCs. They stay plain untyped JS for the remainder of this Flow → TypeScript work; `<script lang="ts">` and real `defineComponent` inference are a Vue 3 concern.
- ESLint 7.32 limits usable `@typescript-eslint` versions; may force a lint-stack upgrade.
- Mocha's spec glob now matches `*.test.{js,ts}`, done in Step 9 for the 2 renamed specs. The other 5 `*.test.js` files never had Flow syntax, so they stay `.js` under parity; converting them is now unblocked but is its own decision.
