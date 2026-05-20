# Bundler-agnostic build

This directory implements a thin adapter layer so the Grunt build can drive any
bundler (esbuild by default, with reference designs for others). It exists to
satisfy [#1085](https://github.com/okTurtles/group-income/issues/1085): if a
bundler becomes unmaintained or we want to switch (Rollup, Vite, Parcel,
esbuild, …), only one adapter file needs to change. The Gruntfile and the rest
of the codebase stay the same.

By design only **one** bundler is active per build. The active bundler is
selected by the `GI_BUNDLER` environment variable (defaults to `esbuild`). The
default bundler's runtime dependency (`esbuild`, etc.) is the only one declared
in `package.json`; other adapters document their own dependency lists and are
unused unless explicitly selected.

## Selecting a bundler

```sh
grunt build                       # uses esbuild (default)
GI_BUNDLER=esbuild grunt build    # explicit
GI_BUNDLER=rollup  grunt build    # only works if rollup + plugins are installed
```

## Layout

```
scripts/bundlers/
  index.js     # dispatcher: requires the adapter named by GI_BUNDLER
  esbuild.js   # esbuild adapter — active by default
  rollup.js    # reference design for Rollup (not wired in by default)
```

The bundler-specific plugins esbuild uses still live under
`scripts/esbuild-plugins/`. Other adapters bring their own plugins.

## Adapter contract

Every adapter module must export the same shape:

```js
module.exports = {
  // Unique short name. Must match the filename (minus extension).
  name: 'esbuild',

  // Build a set of build tasks from a bundler-neutral spec.
  // Returns: { main, serviceWorkers, contracts, contractsSlim }
  // Each task implements: async run({ fileEventName, filePath } = {})
  createBundleTasks (spec) { /* ... */ }
}
```

`spec` is the bundler-neutral configuration the Gruntfile passes in:

```js
{
  development: boolean,
  production:  boolean,
  noChunks:    boolean,                  // grunt --no-chunks
  paths: {
    distContracts, distCSS, distJS,
    contractsDir, serviceWorkerDir, mainSrc
  },
  define: { 'process.env.X': "'value'" } // env replacements
  aliases: { '@assets': './frontend/assets', ... }
}
```

A task's `run({ fileEventName, filePath })`:
- called once with no arguments for the initial build,
- then called on every file event in watch mode. The adapter is responsible for
  invalidating any internal caches based on the event before rebuilding.

## Adding a new bundler

1. Add `scripts/bundlers/<name>.js` exporting `{ name, createBundleTasks }`.
2. Install the bundler's deps in `package.json` (only the chosen one needs to
   be installed — adapters for other bundlers may safely refer to packages
   that aren't installed because they're only `require`d lazily).
3. Run with `GI_BUNDLER=<name> grunt build`.

The `rollup.js` adapter is included as a worked example of step 1: it shows
how the same `createBundleTasks` contract can be implemented on top of Rollup,
but is not active by default and Rollup is not declared as a dependency.
