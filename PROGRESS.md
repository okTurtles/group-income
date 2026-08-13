# Flow → TypeScript Migration: Progress Log

Spec: [`_specs/flow-to-typescript-migration.md`](_specs/flow-to-typescript-migration.md) · Branch: `sebin/task/postkey#6-migrate-to-typescript`

One entry per step. Append-only — supersede a decision with a new entry rather than editing an old one.

**Baseline:** 289 files contain Flow syntax (186 `.vue`, 103 `.js`), measured by stripping each file with `flow-remove-types` and diffing. Excludes `node_modules/`, `dist/`, and pinned `contracts/`.

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

---

## Open items

- 103 `.js` files still on Flow.
- `flowTyper.js`: convert, or leave frozen as a runtime dependency (lower risk — it's bundled into pinned contracts).
- **Deferred to the Vue 3 migration:** typing the 186 `.vue` SFCs. They stay plain untyped JS for the remainder of this Flow → TypeScript work; `<script lang="ts">` and real `defineComponent` inference are a Vue 3 concern.
- ESLint 7.32 limits usable `@typescript-eslint` versions; may force a lint-stack upgrade.
