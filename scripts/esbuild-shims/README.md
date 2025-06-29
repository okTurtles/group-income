The files in this directory are used by `esbuild` using the `inject` option to
make the backend work with different engines. These shims define various
Node.js-only globals used by the project.

For example:

```js
export { default as process } from 'node:process'
```

This will instruct `esbuild` to make `process` available as a global, which
should be the default export from the `node:process` module. This makes the
project work with Node (where this still works, even though `process` is already
defined) and with Deno (which doesn't have `process` globally defined, but it
can be imported).

The `require.js` and `dirname.js` are slightly different and are neded both
for Deno and Node.js. Those provide compatibility for using CommonJS modules
and `__dirname` / `__filename` from ESM projects.
