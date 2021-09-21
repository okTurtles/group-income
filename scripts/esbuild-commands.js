'use strict'

const chalk = require('chalk')
const esbuild = require('esbuild')

/**
 * @param {Object} esbuildOptions - Native esbuild options.
 * @param {Object} otherOptions - Additional options that are not part of the esbuild API.
 * @returns {Object}
 */
const createEsbuildTask = (esbuildOptions = {}, otherOptions = {}) => {
  if (!esbuildOptions.plugins) esbuildOptions.plugins = []

  // Make sure our 'default' plugin is always included.
  esbuildOptions.plugins.push(defaultPlugin)

  return {
    options: { ...esbuildOptions, ...otherOptions },

    // Internal state.
    state: {
      // Holds the latest esbuild result object.
      result: null
    },

    // Used to do an initial build.
    async run () {
      const { state } = this

      if (state.result && esbuildOptions.incremental) {
        throw new Error('Cannot use run() again on this task. Use rerun() instead.')
      }
      state.result = await esbuild.build(esbuildOptions)

      if (otherOptions.postoperation) {
        await otherOptions.postoperation()
      }
    },

    // Used to do a rebuild after an input file event has been detected.
    async rerun ({ fileEventName, filePath }) {
      const { state } = this

      if (!state.result || !esbuildOptions.incremental) {
        throw new Error('Cannot use rerun() on this task. Use run() instead.')
      }
      await state.result.rebuild()

      if (otherOptions.postoperation) {
        await otherOptions.postoperation({ fileEventName, filePath })
      }
    }
  }
}

// This plugin helps reducing code duplication between different build tasks.
const defaultPlugin = {
  name: 'default',
  setup (build) {
    // TODO: add support for multiple entry points per task.
    const entryPoint = build.initialOptions.entryPoints[0]
    const output = build.initialOptions.outdir || build.initialOptions.outfile
    // Will store the build or rebuild start timestamp, in milliseconds.
    let t0 = 0

    build.onStart(() => {
      console.log(chalk`{green esbuild:} ${entryPoint}`)
      t0 = Date.now()
    })

    build.onEnd((result) => {
      if (!result.errors.length) {
        const duration = Date.now() - t0
        console.log(chalk`{green esbuild: created} {bold ${output}} {green from} {bold ${entryPoint}} {green in} {bold ${(duration / 1e3).toFixed(1)}s}`)
      }
    })
  }
}

Object.assign(module.exports, {
  createEsbuildTask
})
