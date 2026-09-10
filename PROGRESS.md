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

## Open items

- 100 Flow-checked `.js` files left to convert (Steps 4–8), plus 3 Flow-ignored ones needing syntax stripped only and 2 `.js.flow` stubs retired (`vueComponentStub`, `tsModuleStub`).
- `flowTyper.js`: convert, or leave frozen as a runtime dependency (lower risk — it's bundled into pinned contracts).
- **Deferred to the Vue 3 migration:** typing the 186 `.vue` SFCs. They stay plain untyped JS for the remainder of this Flow → TypeScript work; `<script lang="ts">` and real `defineComponent` inference are a Vue 3 concern.
- ESLint 7.32 limits usable `@typescript-eslint` versions; may force a lint-stack upgrade.
- `*.test.js` files stay `.js` this PR; converting them needs Mocha's spec glob widened to `*.test.{js,ts}` first.
