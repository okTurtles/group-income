// Ambient globals for the TypeScript build.
//
// This replaced Flow's `[libs]` entry in `.flowconfig`, which pointed at
// `frontend/declarations.js`. That file and the whole Flow toolchain were
// deleted in Step 9; this is now the only source of ambient declarations.
//
// Keep this file free of top-level `import` / `export` statements — either one
// turns it into a module and every declaration below stops being global.

// =============================================================================
// Shared type aliases
// =============================================================================

// Flow's `Function` was just a spelling of `any`, not a function type. e.g.:
// `const a: Function = 42` typechecks under Flow.
// So the mechanical mirror for it in TypeScript is `any`.
//
// TypeScript has no usable 'any function' type to swap in (Its built-in `Function`
// carries no call signature, so it rejects assignment to every specific signature,
// and `@typescript-eslint/no-unsafe-function-type` bans it outright).
// So we declare our own 'any function' type and use it where Flow's `Function` used to be:
type Fn = (...args: any[]) => any

// =============================================================================
// Our globals
// =============================================================================

declare function fetchServerTime (fallback?: boolean | null): Promise<string>

// =============================================================================
// Node globals
// =============================================================================

declare var process: any

// =============================================================================
// Service-worker globals
// =============================================================================

// Some files(e.g. nativeNotification.ts) are used in both the browser and the SW context and
// using WorkerGlobalScope there leads to  TS2304 "cannot find name" ts error.
// Declaring it `any` here is what silences them.
declare const WorkerGlobalScope: any
