'use strict'

// Rollup adapter — reference design only.
//
// This file proves that the bundler-agnostic interface (see ./README.md)
// supports another bundler. It is NOT active by default: Rollup and its
// plugins are not listed in package.json, so `require('rollup')` below will
// throw on a fresh checkout. To actually use it:
//
//   npm install --save-dev rollup @rollup/plugin-alias @rollup/plugin-commonjs \
//       @rollup/plugin-node-resolve @rollup/plugin-replace @rollup/plugin-babel \
//       rollup-plugin-vue rollup-plugin-scss rollup-plugin-vue-inline-svg
//   GI_BUNDLER=rollup grunt build
//
// The structure of this file mirrors `./esbuild.js` exactly so the diff is
// the bundler-specific bits, not the overall shape.

const path = require('path')
const { copyFile } = require('fs/promises')

const ROLLUP_DEPENDENCIES = [
  'rollup',
  '@rollup/plugin-alias',
  '@rollup/plugin-commonjs',
  '@rollup/plugin-node-resolve',
  '@rollup/plugin-replace',
  '@rollup/plugin-babel',
  'rollup-plugin-vue',
  'rollup-plugin-scss',
  'rollup-plugin-vue-inline-svg'
]

const tryRequire = (name) => {
  try { return require(name) } catch (_) { return null }
}

const createBundleTasks = (spec) => {
  const rollup = tryRequire('rollup')
  if (!rollup) {
    throw new Error(
      'Rollup adapter selected (GI_BUNDLER=rollup) but rollup is not installed.\n' +
      'Install: npm install --save-dev ' + ROLLUP_DEPENDENCIES.join(' ') + '\n' +
      'See scripts/bundlers/rollup.js for the reference implementation.'
    )
  }

  const alias = require('@rollup/plugin-alias')
  const commonjs = require('@rollup/plugin-commonjs')
  const nodeResolve = require('@rollup/plugin-node-resolve').default
  const replace = require('@rollup/plugin-replace')
  const vue = require('rollup-plugin-vue')
  const scss = require('rollup-plugin-scss')
  const inlineSvg = require('rollup-plugin-vue-inline-svg')

  const { development, production, paths, define, aliases } = spec
  const { distContracts, distCSS, distJS, contractsDir, mainSrc } = paths

  // Translate alias entries into the shape `@rollup/plugin-alias` expects.
  const aliasEntries = Object.entries(aliases).map(([find, replacement]) => ({
    find: new RegExp(`^${find.replace(/[/.]/g, '\\$&')}(?:/|$)`),
    replacement: path.resolve(replacement) + '/'
  }))

  const sharedPlugins = ({ extraAliases = {} } = {}) => [
    alias({
      entries: [
        ...aliasEntries,
        ...Object.entries(extraAliases).map(([find, replacement]) => ({
          find,
          replacement: path.resolve(replacement)
        }))
      ]
    }),
    replace({ values: define, preventAssignment: true }),
    nodeResolve({ browser: true, extensions: ['.js', '.vue'] }),
    commonjs()
  ]

  const minify = production && tryRequire('@rollup/plugin-terser')

  const mainOptions = {
    input: { main: mainPath(mainSrc) },
    output: {
      dir: distJS,
      format: 'es',
      sourcemap: true,
      entryFileNames: '[name].js',
      chunkFileNames: '[name]-[hash]-cached.js',
      assetFileNames: '../css/[name][extname]'
    },
    plugins: [
      ...sharedPlugins({ extraAliases: { 'vue-slider-component': './node_modules/vue-slider-component' } }),
      vue({ css: false }),
      inlineSvg(),
      scss({ output: `${distJS}/main.css`, outputStyle: development ? 'expanded' : 'compressed' }),
      ...(minify ? [minify()] : [])
    ],
    external: ['crypto']
  }

  const serviceWorkerOptions = {
    input: './frontend/controller/serviceworkers/sw-primary.js',
    output: { dir: distJS, format: 'es', sourcemap: true },
    plugins: sharedPlugins(),
    external: ['crypto']
  }

  const contractsBase = {
    input: [
      `${contractsDir}/group.js`,
      `${contractsDir}/chatroom.js`,
      `${contractsDir}/identity.js`
    ],
    output: { dir: distContracts, format: 'iife', sourcemap: true },
    plugins: [
      ...sharedPlugins(),
      replace({
        values: { ...define, 'process.env.GI_VERSION': "'x.x.x'" },
        preventAssignment: true
      })
    ],
    external: ['@sbp/sbp']
  }
  const contractsSlimOptions = {
    ...contractsBase,
    output: { ...contractsBase.output, entryFileNames: '[name]-slim.js' },
    external: ['@common/common.js', '@sbp/sbp']
  }

  const postBuildMain = async ({ fileEventName, filePath } = {}) => {
    if (!fileEventName || ['.css', '.sass', '.scss'].includes(path.extname(filePath))) {
      await copyFile(`${distJS}/main.css`, `${distCSS}/main.css`)
      if (development) {
        await copyFile(`${distJS}/main.css.map`, `${distCSS}/main.css.map`).catch(() => {})
      }
    }
  }

  const createTask = (options, post) => ({
    async run (event = {}) {
      const bundle = await rollup.rollup(options)
      try {
        await bundle.write(options.output)
        if (post) await post(event)
      } finally {
        await bundle.close()
      }
    }
  })

  return {
    main: createTask(mainOptions, postBuildMain),
    serviceWorkers: createTask(serviceWorkerOptions),
    contracts: createTask(contractsBase),
    contractsSlim: createTask(contractsSlimOptions)
  }
}

// Helper: rollup's `input` map key becomes the output file's basename, so we
// reverse-derive `main` from `mainSrc`.
const mainPath = (src) => src

module.exports = { name: 'rollup', createBundleTasks }
