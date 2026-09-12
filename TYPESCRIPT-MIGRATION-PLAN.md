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

## RULES

Non-negotiable for the duration of this migration. They apply to every step, every commit, and every file.

### 1. Never write "load-bearing"

Banned in all documentation — code comments, Markdown, commit messages, PR descriptions, test names, log output. No variants ("load bearing", "loadbearing", "carries load"). Say what the thing actually does instead: *"ordering the conversion leaf-first is what keeps Flow `.js` out of the program"* rather than *"leaf-first ordering is load-bearing."* The replacement is always more specific than the phrase it replaces, which is the point.

### 2. Mirror Flow exactly — no narrowing, no additions

A Flow type translates to its precise TypeScript equivalent and nothing else. Not a better type. Not a tighter type. Not an extra field, overload, or `readonly`. Not a fixed type, even when the Flow one is provably wrong.

| Flow | TypeScript | Not |
|---|---|---|
| `?T` | `T \| null \| undefined` | `T \| undefined` |
| `any` | `any` | an inferred or hand-written shape |
| `Object` | `any` | `Record<string, unknown>`, an interface |
| `Function` | `any` | a call signature (see Deferred) |
| `mixed` | `unknown` | `any` |
| `{ +x: T }` | `{ readonly x: T }` | `{ x: T }` |
| optional param with a default | mirror the annotation, not the default | — |

This holds **even when the Flow declaration contradicts the implementation.** `fetchServerTime` is the worked example: Flow declares `fallback: ?boolean`, but the implementation is `async (fallback = true)`, so `null` skips the fallback and throws rather than meaning "unspecified". The mirror is still `fallback?: boolean | null`. Record the discrepancy in a comment; do not encode the fix in the type.

**Why:** scope parity is what makes this migration reviewable and reversible. TypeScript must check exactly what Flow checked — no more — so that any behavioural difference after the switch is a bug rather than an intended improvement. Mixing "translate" with "improve" makes the two indistinguishable in a 100-file diff.

**Where the better type goes:** a comment naming the accurate type and the evidence for it, so the later strictness pass can pick it up. See `process` in `frontend/declarations.d.ts` for the shape of that note.

**When the mirror cannot be written at all,** RULES 3 applies. That is the only way out of this rule.

### 3. When the mirror doesn't typecheck, exempt it — and say so

Some Flow annotations have no TypeScript equivalent that compiles. Mirroring those produces a suppression comment instead of a type, which is a worse artifact than the annotation was worth. Those get an exemption from RULES 2.

**The test is narrow, and it is mechanical:** the exemption applies only when the mirrored annotation **fails to compile**, so that keeping it requires a `@ts-expect-error` or an `as` cast to silence TypeScript. Nothing else qualifies. Not "the mirror is ugly." Not "a more accurate type is obvious." Not "the union collapses to `any` and checks nothing." If the mirror compiles, RULES 2 governs and the finding goes in a comment.

The boundary matters, so here it is both ways:

| Situation | Rule | Outcome |
|---|---|---|
| `typeof Error` on a `ChelErrorGenerator` result — TS reads it as `ErrorConstructor`, demands the `Error.isError` static, fails TS2741 | **3** | Annotation dropped; inference stands |
| `Array<*> \| Object \| void` → `args?: Array<any> \| any` — compiles, but `Object` → `any` swallows the other arm so the union checks nothing | **2** | Mirror written as-is, discrepancy noted in a comment (`translations.ts`) |
| `?Object` → `params?: any \| null` — same collapse, still compiles | **2** | Mirror written as-is (`image.ts`) |

**What an exemption may do:** drop the annotation and let inference stand, or use the nearest type that does compile. Prefer dropping — inference is derived from the value and cannot drift from it, whereas a hand-picked replacement is a new claim that nothing checks. **The exception is an annotation that gave callers `any`**, such as an exported function's `Object` return. Dropping it hands callers the inferred shape where Flow gave them `any`, which is new checking, the same scope expansion as Step 5's `flowTyper` exports. Use the nearest type that compiles instead: `createLogger` in `model/logger.ts` is `Promise<any>`. Either way it is the *minimum* departure that compiles, never an opportunity to write the better type; that still belongs to the strictness pass.

**Every exemption is recorded twice:** a comment in the file saying what the annotation was and why it is gone, and a line in `PROGRESS.md` for the step that granted it. An exemption nobody can find later is indistinguishable from a translation error.

**Granted so far:** `typeof Error` — `frontend/common/errors.ts` (Step 4), and `contracts/chatroom.ts:39,40` + `contracts/group.ts:369,370` (Step 5, dropped exactly as Step 4 did). No new exemptions in Step 5. `paymentStatusType`/`paymentType` in `shared/payments/index.ts` looked like candidates — their Flow `: string` describes a validator function and failed as TS2322 — but the `flowTyper`-exports-are-`any` decision made the mirror compile, so both annotations stay exactly as Flow wrote them. Restoring parity beats granting an exemption; check for that before reaching for RULES 3.

**Step 6 granted two.** `model/logger.ts` — `createLogger`'s `Object` return: `any` is rejected as an async function's return type (TS1064), so it is `Promise<any>`, the nearest type that compiles. It is not dropped, because inference would hand the callers the logger's full shape where Flow gave them `any` (see "What an exemption may do"). `notifications/nativeNotification.ts` — `makeNotification`'s `icon?: string`: the body's `typeof icon === 'object'` branch narrows a `string` to `null` and reads `.manifestCid` from it (TS18047), so keeping `string` would take a cast. `icon` is a member of a destructured object type and can't be dropped on its own, so it is `any`, the nearest type that compiles. Both files carry a comment.

---

## The mechanism that makes this incremental

`scripts/esbuild-plugins/flow-remove-types-plugin.js:14` filters on `/\.js$/`. A `.ts` file never reaches it and is handled by esbuild's native TypeScript loader instead. **So Flow `.js` and TypeScript `.ts` coexist in the same build with no extra configuration.**

That single fact sets the whole order below: convert sources file-by-file while Flow tooling stays live, and delete Flow only once nothing needs it (Step 9). The alternative — removing `flow-remove-types` early — breaks all 108 remaining Flow files at once.

**Scope reminder, re-measured at `37bc114e9`:** 116 files still contain Flow syntax. Subtract the 8 in `historical/` (out of scope, untouched) and the tree splits into:

| | Count | Treatment |
|---|---:|---|
| Flow-checked `.js` | **101** | 1 retired in Step 2 (`declarations.js`), 100 converted across Steps 4–8 |
| Flow-ignored but still built | 6 | Strip syntax only, stay `.js`, stay unchecked |
| `.js.flow` stub | 1 | `vueComponentStub.js.flow` — superseded by `shims.d.ts` in Step 2, deleted in Step 9 |
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

## Step 1 — `tsconfig.json` and a non-blocking typecheck — **DONE**

Establishes the parity contract before anything moves. Nearly no source changes — one seeded `.d.ts`, for the reason below.

- **Install `typescript`** — done, pinned exact at **6.0.3**, not latest. TS is at 7.0.2, but `@typescript-eslint` (still v8) peers `typescript: >=4.8.4 <6.1.0`, so installing 7 would strand Step 10's lint stack. 6.0.3 is the newest the planned stack accepts; revisit when typescript-eslint supports 7.
- `tsconfig.json` at root with `allowJs: true`, `checkJs: false`, `noEmit: true`, `strict: false`, `skipLibCheck: true`, `target`/`module` matching the esbuild output, and `paths` mirroring every `Gruntfile.js` alias (`Gruntfile.js:168-184`): `@assets`, `@common`, `@components`, `@containers`, `@controller`, `@model`, `@pages`, `@svgs`, `@utils`, `@view-utils`, `@views`, plus `~`. Note `.flowconfig` maps only 8 of these (`:44-50`) — the extra three are a deliberate correction, not parity drift, since esbuild resolves all eleven.
- **`moduleResolution: "bundler"` — required, not a preference.** 11 of the 15 `@chelonia` import specifiers in `frontend/` are subpaths (`@chelonia/lib/events`, `@chelonia/lib/Secret`, `@chelonia/lib/SPMessage`, …). Those packages expose their declarations through the `exports` map's `types` condition; only the bare `.` entry has a top-level `types` field. Under classic `moduleResolution: "node"` every subpath import resolves to nothing and errors. `"bundler"` also matches how esbuild actually resolves, which is the honest description of this build.
- `exclude` transcribed from the spec's ignore table — the 14 live `.flowconfig` `[ignore]` entries (22 total at `.flowconfig:9-30`, minus 6 stale and 2 redundant), each annotated in the file with the line it maps to. The 6 stale and 2 redundant were re-verified as missing from the tree.
- **`"types": []`.** TypeScript otherwise auto-includes all 19 transitive `node_modules/@types/*` packages as globals, leaking Node types into browser code. Flow drew ambient types only from `[libs]`; this restores parity.
- Add `npm run typecheck` → `tsc --noEmit`. Not yet in `lintTasks` or CI.

### The two things TS 6 forced, which the plan had wrong

**`include` is `frontend/**/*.ts` only — not `frontend/**/*`.** `checkJs: false` suppresses *semantic* errors in `.js`, **not syntactic ones**, and a Flow annotation is a syntax error to TypeScript. Rooting the 126 Flow-annotated `.js` files produced thousands of unsuppressable TS8010/TS1005 parse errors. So `.js` files enter the program only when a `.ts` imports one. Verified by probe: a `.ts` importing `@common/common.js` lights up `translations.js`, `errors.js` and `stringTemplate.js` transitively — **converting leaf-first is what keeps unconverted Flow out of the program, not merely what keeps the diff tidy.** `allowJs: true` and `allowImportingTsExtensions: true` stay, so a converted file can still import an unconverted one.

**`baseUrl` is deprecated in TS 6 and stops working in 7.** Dropped; `paths` now resolve relative to the config file, which TS has supported since 5.0.

Consequently a `.d.ts` had to be seeded now rather than in Step 2: with `.ts`-only roots and no `.ts` files yet, the project has no inputs, and that is a hard error (TS18003). `frontend/declarations.d.ts` exists as a documented placeholder for Step 2 to fill in.

**Done — verified:** `npm run typecheck` exits 0 · `grunt build` green (eslint + flow + puglint + stylelint) · `manifests.json` unchanged · a throwaway probe confirmed all 11 aliases **and** the `@chelonia/*` subpath types resolve with zero TS2307, which is the empirical proof behind both this step's `moduleResolution` choice and Step 2's "no stubs".

---

## Step 2 — Ambient declarations — **DONE**

Everything Step 4 onward depends on. No runtime behaviour changes; no source file converted.

Two new files, split by lifetime:

| File | Counterpart of | Lifetime |
|---|---|---|
| `frontend/declarations.d.ts` | `.flowconfig` `[libs]` → `frontend/declarations.js` | Shrinks toward empty |
| `frontend/shims.d.ts` | `.flowconfig` `module.name_mapper.extension` + `vueComponentStub.js.flow` | Permanent |

**`declarations.d.ts` is 300 lines shorter than the Flow libdef it replaces, and that is the finding of this step.** `frontend/declarations.js` is 311 lines carrying 88 `declare module` stubs plus 5 globals; the TypeScript equivalent needs `fetchServerTime` and `process.env`. Everything else falls into one of four buckets, each verified rather than assumed:

| Bucket | Examples | Why it's gone |
|---|---|---|
| **Resolves on its own** (41 of the 73 package stubs) | `vue`, `vuex`, `vue-router`, `marked`, `turtledash`, `@sbp/*`, `@chelonia/*`, `dompurify`, `vuelidate` | All **42** bare specifiers imported anywhere under `frontend/` were imported from a throwaway `.ts` and typechecked: **zero resolution errors**. Re-stubbing would *outrank* the real declarations and hand back `any` — the exact inversion of the `@chelonia/*` decision |
| **Dead** (the other 32 package stubs) | `@hapi/*`, `hapi-pino`, `pino`, `chalk`, `form-data`, `ws`, `better-sqlite3`, `node:*`, `favico.js`, `lru-cache`, `uuid`, `bottleneck`, `@apeleghq/rfc8188/*`, `@chelonia/multiformats/*`, `@chelonia/lib/{db,presets,zkppConstants}` | Appear nowhere in the repo except `declarations.js`. Leftovers from when the backend lived here, before `chel serve`. Several aren't even installed |
| **Impossible** (all 15 local-path stubs) | `@utils/blockies.js`, `~/frontend/model/contracts/misc/flowTyper.js`, `@common/common.js`, `@model/contracts/shared/*.js`, `./controller/service-worker.js` | **`paths` resolution beats an ambient `declare module` with the same specifier.** Probed: declaring `flowTyper.js` as `any` left all 387 parse errors from its Flow syntax in place. What keeps Flow `.js` out of the program is the leaf-first order, not a stub |
| **Superseded / dead globals** | `crypto`, `logger`, `Compartment` | `lib.dom.d.ts` already declares `crypto: Crypto` (better than the Flow shape, covers all 11 uses; redeclaring collides). `logger` has no global consumer left — every `logger` in `frontend/` is a local binding. `Compartment` has zero references |

`process` stays `any`, as Flow had it — scope parity, decided explicitly rather than by default. Typing it as the 11 keys esbuild actually defines (`Gruntfile.js:627-639`) would be the accurate version and would turn a mistyped env key into a compile error instead of a white-screen ReferenceError: esbuild's `define` is a *textual* substitution, so a key outside that set doesn't read as `undefined`, it throws. All 63 reads across 23 files are literal `process.env.<KEY>` and the 7 keys used are all within the 11 defined, so that shape is green today. Rejected here as a coverage expansion; revisit when strictness is tightened.

`shims.d.ts` declares `*.vue`, `*.svg` and `*.scss` with an `any` default export — the same thing `vueComponentStub.js.flow` said, per extension. Loose on purpose: SFC script blocks are not typechecked by this migration, so a `.vue` module has no type information to expose. Only `*.vue` is reached from a `.ts` today (538 imports, 9 of them from `.js` files that Steps 4-8 convert); `*.svg` and `*.scss` are reached only from `.vue` files so far and are carried for parity. **`vueComponentStub.js.flow` is not deleted here** — Flow still needs it until Step 9.

**`@chelonia/*` need no stubs — confirmed.** Four of the five packages ship real declarations; `@chelonia/cli` doesn't, and nothing in `frontend/` imports it (it's the `chel serve` binary). Reaching the subpath declarations requires the `moduleResolution: "bundler"` set in Step 1.

> This makes Steps 4–8 harder, not easier, and that is the point. Stubs would have made every `@chelonia` value `any` and let the waves through unchallenged; real declarations mean real errors at the largest API surface the frontend touches. Budget for it. Where a genuine mismatch surfaces, prefer `@ts-expect-error` with a one-line reason over reshaping runtime code — behaviour changes are out of scope for this PR, and an untangled `@ts-expect-error` is a visible TODO where a silent `any` is not.

### Moved out of this step

`frontend/model/notifications/types.flow.js` → `types.ts` **is deferred to Step 6.** Attempted and reverted: four Flow files (`selectors.js`, `templates.js`, `utils.js`, `vuexModule.js`) do `import type … from './types.flow.js'`, and Flow cannot read `.ts`, so the rename turns a green `npm run flow` into **4 `cannot-resolve-module` errors**. Nothing in `.ts` imports these types yet, so converting now buys nothing and would cost either a broken Flow run or a second copy of 52 type definitions maintained in parallel for four steps. It converts with its consumers.

**Done:** `npm run typecheck` exits 0 with both `.d.ts` files in the program (confirmed via `tsc --listFiles`), `npm run flow` still reports no errors, `grunt build` succeeds, ESLint exits 0, residual-Flow count unchanged at 108.

---

## Step 3 — Teach the build about `.ts` (Flow stays) — **DONE**

Both type systems live side by side after this step. Nothing is removed.

### What changed

| File | Change |
|---|---|
| `package.json` | `@babel/preset-typescript` 7.23.3 added; `eslint` / `eslintfix` globs → `**/*.{js,ts,vue}`; two new `eslintConfig.overrides` blocks |
| `.babelrc` | `@babel/preset-typescript` added alongside `@babel/preset-flow` |
| `scripts/mocha-helper.js` | `extensions: [...defaults, '.ts']` on `@babel/register` |
| `Gruntfile.js` | `exec:eslint` glob → `**/*.{js,ts,vue}`; dev watch glob → `frontend/**/*.{js,ts}` |
| `.flowconfig` | `module.name_mapper.extension='ts'` → the new stub |
| `frontend/tsModuleStub.js.flow` | **New.** Flow's `any` stand-in for already-converted modules |

`resolveExtensions` was a non-issue as predicted — it does not appear in `Gruntfile.js` and esbuild's default already covers `.ts`. The alias plugin's no-inference behaviour was confirmed by reading `alias-plugin.js:38,45`: it returns a resolved path verbatim, so aliased specifiers must still be hand-edited alongside every rename.

### Flow could not resolve `.ts` at all — the blocker the plan missed

The first probe build failed at `exec:flow`, not at esbuild:

```
Cannot resolve module `@utils/__ts-probe2.ts`. [cannot-resolve-module]
```

This is the same failure that forced `types.flow.js` back out of Step 2, and it is **not** specific to that file. `.flowconfig` has `all=true`, so Flow checks every `.js` in the project; the moment Step 4 renames its first leaf, every still-Flow importer of that leaf fails, and `npm run flow` is a CI step. Step 4 was unrunnable until this was fixed.

The fix follows the shape `.flowconfig` already uses for `.vue` and `.svg`: an extension mapper pointing at a stub that exports `any`. A converted module is TypeScript's to check and `tsc --noEmit` checks it; Flow only needs to stop asking. The mapper line and `frontend/tsModuleStub.js.flow` both die in Step 9.

**The limit of that stub, which constrains Steps 4–8:** it resolves *value* imports only. Verified both ways —

| From a Flow-checked `.js` | Result |
|---|---|
| `import widen, { asAny } from '@utils/x.ts'` | **Works.** Aliased and relative specifiers both resolve to `any` |
| `import type { Shape } from '@utils/x.ts'` | **Fails** — `Cannot use Shape as a type because it is an any-typed value` `[value-as-type]` |

So a module whose *types* are consumed by a still-Flow importer must be converted in the same commit as those importers. This is exactly why `notifications/types.flow.js` sits in Step 6 with its four consumers rather than in Step 2, and the same test now applies to every wave: before renaming a file, check for `import type` against it, not just `import`.

### Babel: no `overrides` needed, but the preset was not installed

`@babel/preset-typescript` was absent from `package.json` — the plan said "add to `.babelrc`" and stopped there. Installed at 7.23.3 to sit with `@babel/core` 7.23.7.

The plan's claim that "Babel applies presets by file extension" is only half true: `@babel/preset-flow` is configured `{ all: true }` and is **not** extension-scoped, so the two presets share every file. Verified directly that they still coexist — `preset-typescript` scopes itself internally, and Flow-only syntax (`{| +a: number |}`, `mixed`) and TypeScript-only syntax (`as`, `enum`, `!`) each compile correctly from their own extension. No `overrides` block was needed.

Installing it bumped six shared `@babel/helper-*` packages to 7.29.7. Babel is not in the esbuild path — it serves `@babel/register` for Mocha and `@babel/eslint-parser` for linting only — so the build is untouched, and the contract-hash check below proves it.

### ESLint: widening the glob broke two things

`@babel/eslint-parser` *parses* `.ts` once the preset is in place, but it does not do TypeScript scope analysis, so core `no-undef` fired on every type name:

```
7:6  error  'ProbeShape' is not defined  no-undef
9:6  error  'ProbeMode' is not defined   no-undef
```

Flow files escape this only because `plugin:flowtype/recommended` enables `flowtype/define-flow-type`, which registers Flow type identifiers as globals. There is no equivalent for TypeScript without `@typescript-eslint`, which is Step 10. `no-undef` is therefore turned **off** for `**/*.ts` — not lost coverage, since `tsc` reports the same thing as TS2304, and `@typescript-eslint` recommends disabling it for TS anyway.

Second, `**/*.ts` also matches `.d.ts`, so the glob dragged in Step 2's ambient declarations and failed the build on them:

```
frontend/declarations.d.ts  79:13  error  'process' is defined but never used   no-unused-vars
frontend/shims.d.ts          38:9  error  'component' is already defined        no-redeclare
```

Every one is inherent to declaration files. `no-redeclare`, `no-unused-vars` and `no-var` are off for `**/*.d.ts` rather than ignoring those files outright — they are hand-written and comment-heavy, so the remaining style rules are worth keeping on them.

### Verified

Probes (a `.ts` leaf, a `.ts` type module, a `.ts` importer of both, a Mocha spec, and a temporary `frontend/main.js` import) exercised every path, then were deleted. Nothing under `frontend/` was converted in this step.

- `tsc --noEmit` exit 0, with `.ts` roots resolving `@utils/*` aliases and pulling a `.js` sibling into the program
- `npm run flow` **No errors!** — with and without a `.ts` import present
- `npm run eslint` exit 0 across `.js`, `.ts`, `.d.ts`, `.vue`
- `grunt build` exit 0 with a `.ts` module bundled into `main.js` (`chel deploy` ran, `manifests.json` written)
- **Contract bundles byte-for-byte identical** to a build from `HEAD` with every Step 3 change stashed — all 6 `dist/contracts/*.js` and all 3 manifests. Step 3 moves no contract hashes.
- `grunt test:unit` 180 passing with 2 probe specs, **178 passing** after removing them — matches the Step 0 baseline. Negative control: dropping the `extensions` option from `mocha-helper.js` reintroduces the failure, so that bullet is real and not defensive.
- `grunt dev` hot reload confirmed live on a `.ts` edit: `file event: 'change' detected on frontend/utils/__ts-probe.ts` → `eslint: linted … in 0.9s` → `esbuild: created dist/assets/js from frontend/main.js in 0.4s` → `[Browsersync] Reloading Browsers`, with the edited value present in the rebuilt bundle. The extension check at `Gruntfile.js:796` needs no `.ts` branch as predicted — a `.ts` file never enters `flowRemoveTypesPluginOptions.cache`, whose plugin filter is `/\.js$/`.
- `scripts/check-residual-flow.js` **108 → 109**, the one new file being `frontend/tsModuleStub.js.flow`. Expected: it is Flow-only scaffolding, and Step 9 deletes it.

**Kept from the plan unchanged:** every `*.test.js` stays `.js` (`exec:test`'s glob at `Gruntfile.js:309` matches `*.test.js` only, and a renamed spec would vanish silently), and the spec glob is not widened — that stays deferred.

---

## Step 3a — The four hardcoded `.js` paths

Small, but its own step because these are the renames that break the build from *outside* the file being renamed, so no amount of care inside a wave catches them.

`Gruntfile.js` names four source paths as literal strings. Two are entry points that Steps 5 and 7 will rename; two must never be renamed at all. Line numbers re-verified after the Step 3 edits.

| `Gruntfile.js` | String | When |
|---|---|---|
| `:677` | `${contractsDir}/{group,chatroom,identity}.js` — contract entry points | **Update in Step 5**, same commit as the rename |
| `:663` | `./frontend/controller/serviceworkers/sw-primary.js` — SW entry point | **Update in Step 7**, same commit as the rename |
| `:684` | `contractsSlim.external = ['@common/common.js', …]` | **Never** — see below |
| `:77` | `mainSrc = frontend/main.js` — main entry point | **Never** — see below |

`frontend/common/common.js` and `frontend/main.js` contain **no Flow syntax**, so scope parity already excludes them from conversion — the risk is a "convert the whole directory" reflex in Step 4, not the plan. Renaming `common.js` would break the slim-contract `external` match, change what gets bundled into the slim contracts, and **move contract hashes** — failing Step 5's central invariant from a file in a different wave entirely.

### Output filenames are not affected — verified

A sweep for other hardcoded references turned up two that look like they belong in the table and do not:

- `frontend/controller/service-worker.js:119` registers `/assets/js/sw-primary.js`
- `frontend/index.html:43` loads `/assets/js/main.js`

Both name **build outputs**, not sources. esbuild writes `.js` for a JS-format bundle regardless of the entry point's extension — confirmed directly: an entry of `__ts-probe-types.ts` produced `__ts-probe-types.js`. So Step 7's `sw-primary.ts` rename leaves the registration URL correct, and Step 5's contract renames leave `dist/contracts/group.js` and the manifest filenames correct. Neither needs editing, and neither is a hidden break.

Three config files also name concrete `.js` source paths — `tsconfig.json`'s `exclude`, `package.json`'s `eslintIgnore`, and `.flowconfig`'s `[ignore]`. Every path they name (`service-worker.js`, `blockies.js`, `flowTyper.js`) is in the Flow-ignored / strip-only set, and `flowTyper.js` is the only one that is ever renamed — already covered by the Step 5 checklist below.

**Done when:** the table is transcribed into the Step 5 and Step 7 checklists (done — see both), and Step 4's diff shows `frontend/common/common.js` untouched.

---

## Steps 4–8 — Source conversion, leaf-first

Same procedure for each wave: convert Flow syntax → TypeScript, rename `.js` → `.ts`, update importers' explicit extensions (`import/extensions` is set to `ignorePackages`, so specifiers and filenames must change together in one commit), run `npm run typecheck` + `grunt test:unit`.

Recurring syntax translations, all governed by RULES 2 — mirror, do not improve: `?T` → `T | null | undefined`, with no exception for a `?boolean` guarding a default parameter (the `| null` is wrong there, and it still gets written; the finding goes in a comment — see `fetchServerTime` in Step 2); `{| |}` → plain object types; `+`/`-` variance → `readonly` where it applies; `mixed` → `unknown`; `Object`/`Function` → `any` initially (tighten later, not now); `$Keys`/`$Values`/`$Shape`/`$Exact` → `keyof`/indexed access/`Partial`/exact-ish equivalents; `import type` carries over directly.

**Before renaming any file, grep for `import type` against it.** Flow's `.ts` stub (Step 3) resolves value imports to `any`, but a `import type { X } from './y.ts'` in a still-Flow importer fails with `[value-as-type]`. A module whose types are consumed by Flow files must be converted in the same commit as those consumers — which is why `notifications/types.flow.js` is in Step 6 and not Step 2.

| Step | Wave | Files | Notes |
|---|---|---|---|
| **4 — DONE** | `frontend/common` 3, `frontend/utils` **9** | **12** | Leaf utilities, few dependents. Smallest wave first to shake out the translation patterns. `common.js` keeps its name but **did** need its three re-export specifiers rewritten — see below. |
| **5 — DONE** | `frontend/model/contracts/**` | **17** + `flowTyper` | 19 files in the tree contain Flow; 2 of them (`misc/flowTyper.js`, `shared/distribution/distribution.test.js`) are Flow-ignored and belong to the strip-only set. The parenthetical list below named `constants` and omitted `types` — it is the other way round: `shared/constants.js` has **no Flow syntax** and so stays `.js` under parity, and `shared/types.js` converts. **Highest risk — see below.** |
| **6 — DONE** | `frontend/model/**` (non-contract): root 10, `chatroom` 3, `notifications` **10**, `settings` 1 | **24** | Depends on Steps 4–5. Includes `notifications/types.flow.js` → `types.ts`, **moved here from Step 2** — renaming it early breaks Flow for its four `import type` consumers in this same directory, so it converts alongside them. |
| **7** | `frontend/controller/**`: root 3, `actions` 9, `app` 3, `e2e` 1, `serviceworkers` 3, `utils` 1 | 20 | Controller root holds 4 Flow files; `service-worker.js` is Flow-ignored (strip-only), leaving 3. `serviceworkers/sw-primary.js` is its own esbuild entry — update `Gruntfile.js:663` in the same commit (Step 3a), then rebuild and smoke-test the SW bundle specifically. |
| **8** | `frontend/views/**` `.js`: `views/utils` 13, `containers/chatroom` 5, `chat-mentions` 2, **`voice-recording` 1**, `components/*` 3, `containers/payments` 1, `roles-and-permissions` 1 — plus root `frontend/setupChelonia.js` | **27** | `views/utils` holds 14 entries; one is the `vueComponentStub.js.flow` stub, superseded on the TypeScript side in Step 2 but deleted only in Step 9, leaving 13 to convert. `voice-recording/voice-recording-utils.js` is new in v2.9.0. View-layer helpers imported by SFCs; SFCs themselves stay untouched plain JS. |

**Total across 4–8: 100.** Plus `frontend/declarations.js`, retired in Step 2 by `declarations.d.ts` = **101 Flow-checked files**, which reconciles with the scope table above.

### What Step 4 turned up — read before starting a wave

Twelve files, all green: `tsc` 0 · `eslint` 0 · `npm run flow` "No errors!" · `grunt build` 0 · **178 passing** · residual Flow **109 → 97**. `frontend/model/contracts/manifests.json` is byte-identical, which matters more here than the count — see the first item.

**Wave 4 already reaches into the contract bundles, so the hash check is not just Step 5's.** The non-slim contract entry points bundle `@common/common.js`, and `common.js` re-exports `translations`, `errors` and (through translations) `stringTemplate` — three of this wave's twelve. Only `contractsSlim` marks `@common/common.js` external (`Gruntfile.js:684`). The manifests came out unchanged, so esbuild's TypeScript loader and `flow-remove-types` emit the same bytes for these files; that is a measured result, not a guarantee, so re-run the check on any wave that touches a module reachable from a contract.

**`common.js` had to be edited after all.** Step 3a says never *rename* it, and that still holds — the `external` string match and the contract hashes both depend on the name. But its three `export * from './errors.js'` / `'./translations.js'` lines are specifiers like any other and had to become `.ts` in this commit. Flow accepts it: `common.js` is still Flow-checked, and the `.ts` stub resolves a re-export the same way it resolves an import.

**Extensionless aliased specifiers keep working across a rename — leave them alone.** `ToastContainer.vue:45` imports `'@utils/constants'` with no extension. `alias-plugin.js` returns an extensionless absolute path from `onResolve`, and esbuild's own resolver then infers the extension, finding `.ts` just as it found `.js`. Verified in the built chunk: `TOAST_POSITIONS` and `MAX_TOAST_COUNT` are bound and their values present. A wave's grep should still find these so you know they exist, but they need no edit. (`PendingApproval.vue:19` has the same shape against `@model/contracts/shared/constants` — Step 5's.)

**`typeof Error` does not survive the mirror — and is the one RULES 2 exemption.** TypeScript reads `typeof Error` as `ErrorConstructor`, which requires the `Error.isError` static; `@chelonia/lib`'s `ChelErrorGenerator` returns a bare constructor without it, so the annotation Flow accepted fails as TS2741. Mirroring it means a `@ts-expect-error` per export, which is a worse artifact than the problem. **Drop the annotation instead** and let the constructor's own type stand — verified assignable to `Error`, with `.message` typed `string` and `instanceof` and `throw` both working. **Step 5 hits this four more times** — `contracts/chatroom.js:39,40` and `contracts/group.js:369,370`; treat them the same way.

**Four TypeScript-only failures that Flow never reported.** None is a translation of a Flow annotation; each is TypeScript checking something Flow inferred loosely, and each is fixed with `any` so that coverage stays where Flow had it:

| Pattern | What TypeScript says | Fix used |
|---|---|---|
| `let options = {}` then `options.width` | TS2339 — the type is `{}`, not an unsealed object | `let options: any = {}` (`faviconBadge.ts`) |
| `function f ({ a, b } = {})` | TS2339 on each destructured name | annotate the parameter `: any` (`lazyLoadedView.ts`) |
| `new Promise(resolve => …)` with no type argument | infers `Promise<unknown>`; the awaited `.size` is TS2339 | annotate the function's return `Promise<any>` (`image.ts`) |
| `Array.from(x)` where `x` is `any` | yields `unknown[]`, not `any[]` | annotate the binding `: any[]` (`trapFocus.ts`) |

**`{| |}` → `{ }` widens, and how much depends on the call site.** TypeScript has no exact object type, so this is the one translation that necessarily loses something. It often loses nothing in practice: excess-property checking covers *fresh object literals*, so an annotation on a function that returns one still rejects an extra key (verified in `trapFocus.ts` — TS2353). It does lose the check where the value is not a fresh literal: a `{| |}` parameter receiving a pre-built object, or a return of a variable rather than a literal. Check which shape you have per site; the translation alone does not tell you.

**A `| void` parameter becomes `?`, not `| undefined`.** Flow lets you omit an argument whose type includes `void`; TypeScript does not, and `L('Hello')` is called with one argument throughout the app. So `args: Array<*> | Object | void` → `args?: Array<any> | any`. Note what that mirror produces: `Object` → `any` swallows the other arm, so the union checks nothing. That is the correct output of RULES 2 and the discrepancy goes in a comment — `translations.ts` and `image.ts` both carry one.

**`$FlowFixMe` comments are deleted, not translated.** Most marked things TypeScript accepts. Where TypeScript does object, it gets its own `@ts-expect-error` naming the error code — `isPwa.ts` is the one case in this wave (`navigator.standalone` is Safari-only).

**The Step 3 Mocha hook is confirmed in use.** `frontend/common/stringTemplate.test.js` is a `.js` test importing `./stringTemplate.ts`; it runs and passes, which is the first real exercise of the `extensions` option added to `@babel/register`.

**One process note:** `git ls-files … | xargs -0 perl -pi` for the specifier rewrite. An unquoted `$files` shell variable does **not** word-split in zsh, so passing a file list that way silently rewrites nothing and reports a "File name too long" error that reads like a listing. Check `git status` after a bulk rewrite, not just the command's exit.

### Step 5 in detail — contract source

This is where a mistake is expensive and slow to surface: per `docs/src/Calls-From-Contracts.md`, anything reachable from a contract is frozen forever once pinned, and a behavioural difference desynchronises state across clients rather than throwing.

- `group.js`, `chatroom.js`, `identity.js`, and `shared/**` (`constants`, `currencies`, `functions`, `time`, `validators`, `distribution/`, `getters/`, `payments/`, `voting/`) — 17 files.
- **`flowTyper.js` is not part of this wave.** It's Flow-ignored (`.flowconfig:22`), so per parity it stays untypechecked. Rename to `flowTyper.ts` with its generics preserved exactly as written (per the spec decision). **`exclude` alone will not keep it unchecked** — verified in Step 1: an excluded `.ts` is still fully typechecked once something imports it, and the contracts import this file. `exclude` only filters the *root* set. The escape hatch that actually works is **`// @ts-nocheck` at the top of the file** (confirmed: silences it, `tsc` exits 0). Add the `exclude` entry too, updated from `.js` to `.ts`, so it never becomes a root either. **Also update the matching `eslintIgnore` entry** in `package.json` — it names `frontend/model/contracts/misc/flowTyper.js` by path, and a stale entry there silently starts linting a file that was deliberately exempt. Runtime behaviour must be byte-for-byte equivalent — the `typeFn.name.includes('optional')` dispatch depends on function `.name` surviving compilation, which no typechecker will catch if broken. The Step 0 harness is the gate.
- **Update the contract entry points at `Gruntfile.js:677`** in the same commit as the `group.js` / `chatroom.js` / `identity.js` renames (Step 3a). Nothing else in the build knows those paths.
- **Four `typeof Error` annotations get dropped, not mirrored** — `chatroom.js:39,40` and `group.js:369,370`, the same TS2741 Step 4 hit in `common/errors.ts`. Follow that file: no annotation, and its comment explains why.
- Do **not** run `grunt pin`. Existing snapshots under `contracts/` must be untouched — the current pinned set runs to `2.9.0`, and `chelonia.json` points at it.
- Verify `frontend/model/contracts/manifests.json` is byte-identical after a production build — contract hashes must not move.

**Done when each wave:** typecheck passes, unit tests pass, build succeeds, and — for Step 5 — the emitted contract code and the `flowTyper` equivalence tests are unchanged. On "contract hashes", read the next section first: the hashes *do* move, and the reason is not what the invariant assumed.

### What Step 5 turned up — the contract-hash invariant was wrong

Seventeen files converted plus `flowTyper`, all green: `tsc` 0 · `eslint` 0 · `npm run flow` "No errors!" · `NODE_ENV=production grunt build` 0 · **178 passing**, Step 0's `flowTyper` equivalence harness included. Pinned snapshots under `contracts/` untouched, `chelonia.json` untouched, no `grunt pin`.

**`manifests.json` is gitignored, so `git diff` on it can never fail.** It is a build output (`frontend/model/contracts/.gitignore:1`) and is not tracked. Any "hashes unmoved, verified by `git diff`" claim — Step 4's included — checked nothing. The real check is: copy the file, rebuild, `diff` the copies. Two consecutive production builds were confirmed byte-identical first, so the baseline is trustworthy. The git-verifiable invariant is `contracts/**`, the pinned snapshots, which *are* tracked.

**The contract hashes move on any wave that renames a file reachable from a contract, and that is unavoidable.** All three moved here. The cause is esbuild's source-path banner: the bundle contains `// frontend/model/contracts/group.js` comment lines naming each input file, and a rename rewrites them. Proven by rebuilding both trees and comparing: all six bundles (`group`, `chatroom`, `identity` and their `-slim` variants) are **identical in size and byte-for-byte identical once the banner comments are normalised** — 138092 bytes both ways for `group.js`, and the only differing lines in the raw diff are banners. So the emitted contract *code* is unchanged; only a comment is.

This means Step 4 moved the hashes too, and its "byte-identical" note was an artifact of the broken check. Nothing pinned is affected either way — pinned versions are frozen files under `contracts/`, and this wave does not touch them. The next `grunt pin` will produce different bytes than it would have pre-migration, which is expected of a new version and is not a behaviour change.

**Restate the invariant as:** the emitted contract code must be identical modulo esbuild path banners, and `contracts/**` must show no git diff. Verify with a normalised comparison of the built bundles, not with the hash.

**An ignored module's exports are `any` to Flow, and letting TypeScript infer them instead is a scope expansion.** `flowTyper` is in `.flowconfig` `[ignore]`, so Flow resolved every import from it to `any` and never checked the contracts' call sites into it. `@ts-nocheck` does not reproduce that: it silences errors *inside* the file, but TypeScript still infers the exports' real signatures and checks callers against them. That produced 12 errors in `group.ts`, `identity.ts` and `payments/index.ts` — wrong argument counts, non-callable expressions, a validator assigned to `: string` — all of them new checking on code that is frozen once pinned. Fixing them would have meant editing contract source to satisfy types Flow never enforced. Every `flowTyper` export is annotated `any` instead, which is exactly the face Flow presented; the internal types stay as written. **Steps 6–8: any other `.flowconfig` `[ignore]` file that gets renamed needs the same treatment.**

**`@ts-nocheck` does not suppress syntax errors, so a strip-only file still needs a real syntax translation.** Step 1 verified `@ts-nocheck` silences an excluded file; it does not silence a *parse* failure, and `flowTyper` is dense with Flow syntax (110 of the first 114 errors). Bounded generics `<T: B>` → `<T extends B>`, unnamed function-type params `(mixed, _?: string) => T` → named, Flow casts `(x: T)` → `x as T`, `*` → `any`, `?T` → `T | null | undefined`, `?p: T = d` → `p: T = d`. Runtime is untouched by all of it — the equivalence harness, including the `.name`-survival tests the dispatch depends on, still passes.

**Two Flow/TS gaps showed up in contract source, both already documented translations.** Unannotated params that call sites omit (`removeGroupChatroomProfile`'s 4th, `leaveChatRoomAction`'s 6th) are optional to Flow's inference and required in TypeScript → mark them `?`. And `const options = {}` is a sealed `{}` in TypeScript, so dot-reads are TS2339 → `: any`, same as `faviconBadge.ts` in Step 4.

**Two dead `$FlowFixMe[incompatible-use]` suppressions were replaced with the file's own idiom, not with `@ts-expect-error`.** Both sit on the same `Object.entries(state._vm.authorizedKeys).filter(([, key]) => key.meta…)` shape, where `Object.entries` of an `any` yields `unknown` values. The same two files already annotate this exact pattern as `([, state]: [string, Object])` three lines over, so the mirror `[string, any]` is what went in. A suppression comment for a checker that no longer reads the file is not worth carrying forward.

**`shared/constants.js` stays `.js`.** No Flow syntax, so parity excludes it — the same reasoning the plan already applies to `common.js` and `main.js`. It is also the most-imported file in the wave by a wide margin (70+ specifiers), so leaving it alone is the difference between 132 specifier edits and 200+.

**Rewrite specifiers by resolving them, not by pattern-matching.** A first pass with hand-written path patterns silently missed relative sibling imports (`./mincome-proportional.js`). The rewrite that ran instead resolves every quoted `.js` specifier through the alias table and `~/`, and rewrites only those that land on a renamed file: 132 specifiers across 77 files, with `gi.contracts/*` SBP selector strings and `shared/constants.js` provably untouched. Worth reusing verbatim for Steps 6–8.

### What Step 6 turned up

Twenty-four files, all green: `tsc` 0 · `eslint` 0 · `npm run flow` "No errors!" · `NODE_ENV=production grunt build` 0 · **178 passing** · 71 → 47 left. `contracts/**` and `chelonia.json` untouched. The Step 5 resolver was reused, extended to map `<name>.flow.js` to `<name>.ts`: 61 specifiers across 34 files.

**No contract bundle moved, as expected.** Contract source reaches outside `contracts/` only for `@common/common.js` and `@utils/events.js`, so nothing in this wave is in a contract's module graph. All six bundles and `manifests.json` are byte-identical to a pre-change production build, raw, with no banner normalisation needed.

**Check emitted code per file, not per bundle.** The minified `main.js` and `sw-primary.js` differ by a few bytes, but only in content-hashed chunk filenames and minifier identifier assignment, and a whole-bundle diff cannot tell those apart from a real change. So each file was compiled both ways: the `HEAD` `.js` through `flow-remove-types` (`all: true`) and esbuild's JS loader, and the new `.ts` through esbuild's TS loader with this `tsconfig.json`. After normalising specifier extensions, 22 of 24 are identical. `featureCheck.ts` and `nativeNotification.ts` differ only in comments that esbuild keeps inside expressions. This also rules out the one TS-loader risk a typecheck cannot see: esbuild drops unused imports from `.ts` but keeps them in `.js`. Reuse the check for Steps 7–8.

**`@babel/eslint-parser` does not count type-only uses, so a mirrored `import type` fails `no-unused-vars`.** This is the `.ts` twin of Step 3's `no-undef` problem, but Step 3's fix does not transfer. That override was justified because `tsc` reports TS2304 in its place, and nothing reports unused locals here (`noUnusedLocals` is off). So each site gets `// eslint-disable-next-line no-unused-vars -- <reason>`: 4 here, and at most 11 more in Steps 7–8, which is every `import type` line left. Step 10's `@typescript-eslint/no-unused-vars` removes them.

**lib.dom gaps get `@ts-expect-error`, as in `isPwa.ts`.** `nativeNotification.ts` runs in both the window and the service worker. `permissions.query`'s `userVisibleOnly`, `typeof WorkerGlobalScope`, `self.clients` and `self.registration` are all absent from the `DOM` lib, and Flow accepted all four without a suppression. **Step 7 has ~17 more:** `self.clients`/`self.registration`/`self.skipWaiting` in `sw-primary.js` and `push.js`, and `WorkerGlobalScope` in `actions/identity.js`. Decide there whether one shared declaration beats per-site suppressions. `self` cannot simply be redeclared, because lib.dom already types it.

**Flow saw every `@chelonia/lib/*` import as `any`, so real declarations can add checking the Flow code never had.** `templates.ts` hit this. `SPMessage#opType()` returns `SPOpType`, which `[OP_ACTION_ENCRYPTED, OP_ACTION_UNENCRYPTED].includes()` rejects, and `decryptedValue()` returns `unknown`. Neither is a defect in the code, so the two bindings are annotated `any`, which is exactly Flow's coverage, rather than suppressed.

**Four more TypeScript-only patterns:**

| Pattern | What TypeScript says | Fix used |
|---|---|---|
| `Object.entries(x)` / `Object.values(x)` where `x` is `any` | values are `unknown`; destructuring or indexing with them is TS2339/TS2538 | `([k, v]: [string, any])`, `(k: any)`, or an `any` binding for a `.find()` result. Step 5's idiom, and where most of `state.ts`'s 14 `$FlowFixMe`s sat |
| `[[fn, n], [fn, n]].forEach(([f, n]) => …)` | the literal is inferred as `(number \| fn)[][]`, not tuples: TS2349/TS2365 | `([f, n]: [any, any])` (`notifications/utils.ts`) |
| `event.target.result` in a handler on a typed `IDBOpenDBRequest` | `event.target` is `EventTarget`: TS2339 | `(event: any)` (`localforage.ts`) |
| `new Promise((resolve) => … resolve())` | un-parameterized means `Promise<unknown>`, whose `resolve` needs an argument: TS2794 | `new Promise<void>`. Not `any`, which is no more optional than `unknown`; matches the file's own `LocalforageInstance` type |

**A trailing `...` in a Flow object type is dropped.** Flow 0.154 is not `exact_by_default`, so `{ a: T, ... }` and `{ a: T }` mean the same thing, and both translate to a plain TypeScript object type (`notifications/types.ts`).

The two RULES 3 exemptions are recorded under RULES.

---

## Step 9 — Remove Flow

Only now is nothing depending on it.

- **The strip-only set is 3 files of real syntax, not 6** — measured in Step 0 with `scripts/check-residual-flow.js --why`, which reports per-file what would actually change:

  | File | What's actually there |
  |---|---|
  | `frontend/controller/service-worker.js` | 7 real annotations (`(obj: Object)`, `?ServiceWorker`, an `(x: any)` cast) |
  | `test/backend.test.js` | 2 real signatures |
  | `.../shared/distribution/distribution.test.js` | 1 real signature |
  | `Gruntfile.js` | **No Flow syntax.** Its only hit is the prose comment at `:216` naming the pragma |
  | `scripts/refcount-fuzzer.js` | **No Flow syntax.** Its only hit is the `/* @noflow */` pragma at `:1` |

  `flow-remove-types` strips the pragma out of comments too, so a file that merely *mentions* it registers as containing Flow. Both bottom rows are comment deletions, not conversions. (`flowTyper.js` was handled in Step 5.) Syntax removal only — **no type coverage added**, these stay excluded.
- Remove `flowRemoveTypesPlugin` from `defaultPlugins` (`Gruntfile.js:707,712`) and delete `scripts/esbuild-plugins/flow-remove-types-plugin.js`.
- `.babelrc`: drop `@babel/preset-flow`, keep `@babel/preset-typescript`.
- Replace `exec:flow` (`Gruntfile.js:301`) with a `tsc --noEmit` task; update `lintTasks` (`:463`); remove the `flow stop` call (`:874`) and the `@flow`/`all`-option comment at `:216-217`.
- Delete `.flowconfig`. Remove `flow-bin`, `flow-remove-types`, `@babel/preset-flow` from `package.json`; replace the `flow` npm script with `typecheck`.
- **Delete `frontend/tsModuleStub.js.flow`** (added in Step 3) along with the `module.name_mapper.extension='ts'` line that points at it. It is the one file the residual-Flow gate would otherwise trip on, and by this point every `.ts` importer is a `.ts` file, so nothing resolves through it any more. `vueComponentStub.js.flow` goes at the same time, superseded by `shims.d.ts` since Step 2.
- **CI wiring — confirmed, not assumed.** `.github/workflows/ci.yml:24` runs `grunt ci-test:unit`, which is `['build', 'chelDeploy', 'backend:launch', 'exec:test']` (`Gruntfile.js:855`); `build` runs `lintTasks` unless `:skiplint` (`:463-466`). So swapping `exec:flow` for the `tsc` task does put typechecking in CI, with no workflow edit. Note the other job, `ci-test:cypress` (`:856`), uses `build:skiplint` and therefore never typechecked under Flow either — leave it that way.

**Gate:** `node scripts/check-residual-flow.js --gate` exits 0 — zero files outside `node_modules/`, `dist/`, `contracts/`, and `historical/`.

---

## Step 10 — ESLint stack upgrade

Deliberately last. Doing it earlier would mean finding an `eslint-plugin-flowtype` build that runs on ESLint 8 — extra work for tooling being deleted anyway. By now the Flow plugins are gone, so nothing constrains the upgrade.

- ESLint 7.32 → **8.57.1**, not 9. ESLint 9 requires flat config and drops `package.json` `eslintConfig` support, which would force rewriting the whole config; 8.57.1 keeps the existing `eslintConfig` block working and satisfies `@typescript-eslint` v8's minimum of ESLint ≥ 8.57.0. CI's Node 22 clears the Node ≥ 18.18 floor.
- **The two `eslintConfig.overrides` blocks from Step 3 are not scaffolding** — neither gets removed as part of finishing the migration. `no-undef` on `.ts` is wrong under any parser (TypeScript reports the same thing as TS2304), and the `**/*.d.ts` exemptions describe what declaration files inherently are. What *may* change here is whether they are still needed **explicitly**: `plugin:@typescript-eslint/recommended` pulls in `eslint-recommended`, which disables `no-undef` (and `no-redeclare`) for TS itself, and `@typescript-eslint/no-unused-vars` may already exempt ambient declarations. Check each of the four rules against the new config and delete only the ones proven redundant — do not assume, and do not delete the blocks wholesale. Add `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` v8. Set `parser` for `.ts` via an `overrides` block so `.vue` files keep `@babel/eslint-parser` — `eslint-plugin-vue` still needs it. Start with `plugin:@typescript-eslint/recommended`; **defer type-aware linting** (`recommended-type-checked`) — it needs `projectService`/`project` wiring and is a meaningful slowdown, so it belongs to the later strictness pass.
- Companion bumps ESLint 8 requires, all versions confirmed against `package.json`: `eslint-config-standard` 16.0.2 → 17.1, `eslint-plugin-vue` 7.20.0 → 9, `eslint-plugin-promise` 4.2.1 → 6, `eslint-plugin-import` 2.22.1 → 2.29+, and `eslint-plugin-node` 11.1.0 → `eslint-plugin-n` (renamed).
- Removing Flow from ESLint is **three** edits to the `package.json` `eslintConfig` block, not one — miss any and the config fails to load once the plugin is uninstalled: the `plugin:flowtype/recommended` entry in `extends`, `"flowtype"` in `plugins`, and the `flowtype/no-types-missing-file-annotation` entry in `rules`. Then drop both packages. `eslint-plugin-flowtype-errors` is a devDependency with **no** config entry — package removal only.
- **Expect new findings.** `eslint-plugin-vue` 7 → 9 adds rules, and the Step 002 discovery still applies: the removed `}: Object)` cast had been hiding 182 components from `vue/*` rules entirely. Fix what it surfaces or explicitly disable with a reason — don't blanket-disable.
- **Delete the `no-unused-vars` disables added in Steps 6–8.** Core `no-unused-vars` under `@babel/eslint-parser` does not count type-only uses, so every mirrored `import type` in a `.ts` file carries `// eslint-disable-next-line no-unused-vars -- type-only uses, which @babel/eslint-parser does not count` (4 from Step 6, up to 11 more from Steps 7–8). The parser swap is what makes them unnecessary: `plugin:@typescript-eslint/recommended` turns the core rule off and uses `@typescript-eslint/no-unused-vars`, which counts type references. The ESLint upgrade on its own does not. **They will not flag themselves.** `reportUnusedDisableDirectives` is opt-in in 8.57.1, and nothing in this repo sets it (`package.json`, `exec:eslint`, the npm scripts). So after the swap, run the lint once with `--report-unused-disable-directives`, delete what it reports, and grep for the reason text to confirm none remain. Treat the flag as a one-off: it can also report older, unrelated disable comments, so review those individually rather than turning it on permanently by default.

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
  - **The `Function` ones carry an intent the `any` does not.** `Function` in Flow 0.154 is a spelling of `any`, not a function type: `const a: Function = 42`, `= 'hello'`, `= { a: 1 }` and `null` into a `Function` parameter all typecheck, and a `Function` value assigns out to `string`. `Function` → `any` is therefore an exact mirror, not a widening — but the authors who wrote `Function` mostly meant "a JS function", and restoring *that* is the deferred work. Use `(...args: any[]) => any`, not TypeScript's `Function`, which carries no call signature (so it rejects assignment to every specific signature) and is banned by `@typescript-eslint/no-unsafe-function-type`. Confirm the intent per site first: at `frontend/model/logServer.ts:5` the `Function` return was simply wrong — every path returns `undefined` and both callers discard it — so `any` stands there.
- Converting `*.test.js` files, and widening Mocha's spec glob to `*.test.{js,ts}` to allow it
- Type-aware ESLint rules (`recommended-type-checked`)
- Typing `.vue` SFCs — belongs to the Vue 3 migration
- Real `@chelonia/*` types, if those packages ship declarations later
- Reconciling `eslintIgnore` with `.flowconfig` (the two lists differ today)
- Re-pinning contracts
