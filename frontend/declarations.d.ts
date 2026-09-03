// Ambient declarations for the TypeScript build.
//
// This is the counterpart of Flow's `[libs]` entry in `.flowconfig`, which
// points at `frontend/declarations.js`. Both exist side by side for now: Flow
// reads the `.js`, TypeScript reads this file.
//
// STATUS: seeded in Step 1, filled in by Step 2 of TYPESCRIPT-MIGRATION-PLAN.md.
// Step 2 translates the 311 lines of `frontend/declarations.js` — the globals
// (`fetchServerTime`, `logger`, `process`, `Compartment`, `crypto`) and the
// `declare module` stubs — and adds the `*.vue` / `*.svg` module shims that
// replace `.flowconfig`'s `module.name_mapper.extension` entries.
//
// It is intentionally not empty of purpose: `tsconfig.json` roots only `.ts`
// files, and TypeScript errors (TS18003) when a project has no inputs at all,
// so this file is what makes `npm run typecheck` meaningful before the first
// source file is converted.
//
// Keep this file free of top-level `import` / `export` statements — that would
// turn it into a module and its declarations would stop being global.

declare const __TYPESCRIPT_MIGRATION_PLACEHOLDER__: never
