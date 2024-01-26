# README

This folder exists because we are not able to import basic things from the [`multiformats`](https://github.com/multiformats/js-multiformats) project into this repo because of our Babel setup. Maybe if babel can be fixed, or removed entirely from this project, then this folder can be deleted.

Attempts to use the esbuild aliases plugin, along with the `babel-plugin-module-resolver` plugin, all failed to get this line working in `shared/functions.js`:

```js
import { base58btc } from 'multiformats/bases/base58'
```

If you can get it working via babel, or by removing babel (preferred method), by all means go for it!
