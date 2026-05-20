'use strict'

// esbuild adapter for the bundler-agnostic build (issue #1085).
//
// All esbuild-specific configuration and plugin wiring lives here, so the
// Gruntfile and the rest of the codebase have no esbuild imports. To swap
// bundlers, write a sibling file (e.g. `rollup.js`) that implements the same
// contract documented in `./README.md`.

const path = require('path')
const { copyFile } = require('fs/promises')

const { createEsbuildTask } = require('../esbuild-commands.js')

const createAliasPlugin = require('../esbuild-plugins/alias-plugin.js')
const createFlowRemoveTypesPlugin = require('../esbuild-plugins/flow-remove-types-plugin.js')
const createSvgPlugin = require('../esbuild-plugins/vue-inline-svg-plugin.js')
const createVuePlugin = require('../esbuild-plugins/vue-plugin.js')

// Translate a bundler-neutral spec into native esbuild option bags + plugin
// instances, then expose a per-target `{ run }` task for the Gruntfile.
const createBundleTasks = (spec) => {
  const { development, production, noChunks, paths, define, aliases } = spec
  const { distContracts, distCSS, distJS, contractsDir, mainSrc } = paths

  const aliasPluginOptions = { entries: aliases }

  // By default, `flow-remove-types` doesn't process files which don't start
  // with a `@flow` annotation, so we pass `all` since we don't use them.
  const flowRemoveTypesPluginOptions = { all: true, cache: new Map() }

  // https://github.com/sass/dart-sass#javascript-api
  const sassPluginOptions = {
    cache: false, // Enabling it causes an error: "Cannot read property 'resolveDir' of undefined".
    sourceMap: development, // This option has currently no effect.
    outputStyle: development ? 'expanded' : 'compressed',
    loadPaths: [
      path.resolve('./node_modules'), // So we can `@import 'vue-slider-component/lib/theme/default.scss'`.
      path.resolve('./frontend/assets/style') // So we can `@import '_variables.scss'`.
    ],
    importer (url) {
      // So we can `@import '@assets/style/_variables.scss'` from <style> blocks.
      return url.startsWith('@assets/')
        ? { file: path.resolve('./frontend/assets', url.slice('@assets/'.length)) }
        : null
    }
  }

  // These maps' keys are relative paths, values are compiled JS strings; we
  // keep them here so we can selectively invalidate on file events.
  const svgInlineVuePluginOptions = { cache: new Map(), debug: false }
  const vuePluginOptions = {
    aliases: {
      ...aliasPluginOptions.entries,
      'vue-slider-component': './node_modules/vue-slider-component'
    },
    cache: new Map(),
    debug: false,
    flowtype: flowRemoveTypesPluginOptions
  }

  const aliasPlugin = createAliasPlugin(aliasPluginOptions)
  const flowRemoveTypesPlugin = createFlowRemoveTypesPlugin(flowRemoveTypesPluginOptions)
  const sassPlugin = require('esbuild-sass-plugin').sassPlugin(sassPluginOptions)
  const svgPlugin = createSvgPlugin(svgInlineVuePluginOptions)
  const vuePlugin = createVuePlugin(vuePluginOptions)

  const defaultPlugins = [aliasPlugin, flowRemoveTypesPlugin]

  // https://esbuild.github.io/api/
  const defaults = {
    bundle: true,
    chunkNames: '[name]-[hash]-cached',
    define,
    external: ['crypto', '*.eot', '*.ttf', '*.woff', '*.woff2'],
    format: 'esm',
    loader: {
      '.eot': 'file',
      '.ttf': 'file',
      '.woff': 'file',
      '.woff2': 'file'
    },
    minifyIdentifiers: production,
    minifySyntax: production,
    minifyWhitespace: production,
    outdir: distJS,
    sourcemap: true,
    // Warning: split mode has still a few issues. See https://github.com/okTurtles/group-income/pull/1196
    splitting: !noChunks
  }

  const mainOptions = {
    ...defaults,
    assetNames: '../css/[name]',
    entryPoints: [mainSrc],
    plugins: [...defaultPlugins, sassPlugin, svgPlugin, vuePlugin]
  }
  const serviceWorkerOptions = {
    ...defaults,
    entryPoints: ['./frontend/controller/serviceworkers/sw-primary.js'],
    plugins: [...defaultPlugins]
  }

  const contractsBase = {
    bundle: true,
    define: {
      ...define,
      // Prevent contract hash from changing each time we build them.
      'process.env.GI_VERSION': "'x.x.x'"
    },
    // Format must be 'iife' because we don't want 'import' in the output.
    format: 'iife',
    splitting: false,
    outdir: distContracts,
    entryPoints: [
      `${contractsDir}/group.js`,
      `${contractsDir}/chatroom.js`,
      `${contractsDir}/identity.js`
    ],
    external: ['@sbp/sbp'],
    plugins: [...defaultPlugins]
  }
  const contractsSlimBase = {
    ...contractsBase,
    entryNames: '[name]-slim',
    external: ['@common/common.js', '@sbp/sbp'],
    plugins: [...defaultPlugins]
  }

  const otherOptions = {
    main: {
      // Our `index.html` loads CSS from `dist/assets/css`, but esbuild writes
      // `main.css` and `main.css.map` next to `main.js` — copy them over.
      postoperation: async ({ fileEventName, filePath } = {}) => {
        if (!fileEventName || ['.css', '.sass', '.scss'].includes(path.extname(filePath))) {
          await copyFile(`${distJS}/main.css`, `${distCSS}/main.css`)
          if (development) {
            await copyFile(`${distJS}/main.css.map`, `${distCSS}/main.css.map`)
          }
        }
      }
    }
  }

  const main = createEsbuildTask(mainOptions, otherOptions.main)
  const serviceWorkers = createEsbuildTask(serviceWorkerOptions)
  const contracts = createEsbuildTask(contractsBase)
  const contractsSlim = createEsbuildTask(contractsSlimBase)

  // Invalidate caches before a rebuild so changed inputs are reread.
  const wrap = (task) => ({
    async run (event = {}) {
      const { fileEventName, filePath } = event
      if (filePath && (fileEventName === 'change' || fileEventName === 'unlink')) {
        const ext = path.extname(filePath)
        if (ext === '.js') {
          flowRemoveTypesPluginOptions.cache.delete(filePath)
        } else if (ext === '.svg') {
          svgInlineVuePluginOptions.cache.delete(filePath)
        } else if (ext === '.vue') {
          vuePluginOptions.cache.delete(filePath)
        }
        // Clear the whole Vue plugin cache if a Sass or SVG file was changed,
        // since compiled Vue files might inline them.
        if (['.sass', '.scss', '.svg'].includes(ext)) {
          vuePluginOptions.cache.clear()
        }
      }
      await task.run(event)
    }
  })

  return {
    main: wrap(main),
    serviceWorkers: wrap(serviceWorkers),
    contracts: wrap(contracts),
    contractsSlim: wrap(contractsSlim)
  }
}

module.exports = { name: 'esbuild', createBundleTasks }
