# Flow → TypeScript Migration: Progress Log

Spec: [`_specs/flow-to-typescript-migration.md`](_specs/flow-to-typescript-migration.md) · Plan: [`TYPESCRIPT-MIGRATION-PLAN.md`](TYPESCRIPT-MIGRATION-PLAN.md) · Branch: `sebin/task/postkey#6-migrate-to-typescript`

One short entry per step — what changed, and the outcome. Rationale lives in the spec and the plan.

**Principle — scope parity with Flow.** TypeScript checks exactly what Flow checked; no coverage expansion.

---

### 001 — Migration spec written — DONE

Scoped the work. Risks flagged: pinned contracts must stay behaviourally frozen; `flowTyper.js` is runtime code, not erasable types; esbuild doesn't typecheck, so `tsc --noEmit` must reach CI.

### 002 — Flow dropped from `.vue` files — DONE

Stripped Flow from 184 `.vue` files (182 were just the `}: Object)` cast); SFC typing deferred to the Vue 3 migration. Removed `flowRemoveTypes` from `vue-plugin.js` and the `flow:vue` script.

The cast had been disabling all `vue/*` rules — with it gone, 2 latent bugs surfaced and were fixed (`UsersSelector.vue`, `InvitationLinkModal.vue`).

Verified: lint, `flow check`, prod build, unit + E2E green, contract hashes unchanged. 187 files, +392/−405.

### 003 — Spec: scope parity made explicit — DONE

Spec only. Added the parity principle and the `.flowconfig` → `tsconfig` ignore mapping. `historical/` ruled out of scope entirely. Of the 22 `[ignore]` entries, 6 are stale and 2 redundant — not to be transcribed.

### 004 — Implementation plan written — DONE

11 steps, single PR, each ending green. Order rests on `flow-remove-types-plugin.js:14` filtering `/\.js$/`, so `.ts` and Flow `.js` coexist and Flow removal can come last (Step 9). ESLint upgrade last (Step 10), target 8.57.1.

### 005 — Plan re-verified at master `37bc114e9` (v2.9.0) — DONE

Plan only. Scope is now 108 files: 101 to convert, 6 strip-only, 1 stub (v2.9.0 added 2; fixed a double-count).

Three plan changes: `@chelonia/*` ship real declarations, so no stubs and `moduleResolution: "bundler"` is required; `@babel/register` needs `extensions: ['.js', '.ts']` or Mocha can't load `.ts`; new Step 3a covers 4 hardcoded `.js` paths in `Gruntfile.js`. Struck the `resolveExtensions` bullet — no such option, and the alias plugin does no extension inference.

---

## Open items

- 101 files to convert (2 in Step 2, 99 across Steps 4–8), 6 to strip, 1 stub to retire.
- Typing the 186 `.vue` SFCs — deferred to the Vue 3 migration.
- `*.test.js` files stay `.js` this PR; converting them needs Mocha's spec glob widened first.
