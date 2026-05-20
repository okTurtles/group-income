'use strict'

// Bundler-agnostic build entry point (issue #1085).
//
// Picks the active bundler based on the GI_BUNDLER environment variable
// (defaults to 'esbuild'). Each adapter implements the same contract:
//
//   { name, createBundleTasks(spec) → { main, serviceWorkers, contracts, contractsSlim } }
//
// See `./README.md` for the full contract.

const path = require('path')

const DEFAULT_BUNDLER = 'esbuild'

const loadBundler = (name = process.env.GI_BUNDLER || DEFAULT_BUNDLER) => {
  // Sanity-check the name: must be a simple identifier so we never load
  // anything outside this folder.
  if (!/^[a-z][a-z0-9-]*$/i.test(name)) {
    throw new Error(`Invalid GI_BUNDLER value: ${JSON.stringify(name)}.`)
  }
  const fs = require('fs')
  const adapterPath = path.join(__dirname, `${name}.js`)
  if (!fs.existsSync(adapterPath)) {
    throw new Error(`Unknown bundler: ${name}. Add scripts/bundlers/${name}.js to support it.`)
  }
  const adapter = require(adapterPath)
  if (!adapter || adapter.name !== name || typeof adapter.createBundleTasks !== 'function') {
    throw new Error(`Bundler adapter scripts/bundlers/${name}.js does not satisfy the adapter contract.`)
  }
  return adapter
}

module.exports = { loadBundler, DEFAULT_BUNDLER }
