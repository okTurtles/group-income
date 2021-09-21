'use strict'

const chalk = require('chalk')
const esbuild = require('esbuild')

const createEsbuildTask = (options = {}, { rebuildDelay, rebuildThrottle } = {}) => {
  if (!options.plugins) options.plugins = []

  options.plugins[options.plugins.length] = defaultPlugin

  return {
    options,

    // Internal state.
    state: {
      // Holds the latest esbuild result object.
      result: null
    },

    // Calls to run can be batched and throttled according to the corresponding options.
    async run () {
      const { options, state } = this

      try {
        if (state.result) {
          await state.result.rebuild()
        } else {
          state.result = await esbuild.build(options)
        }
      } catch (error) {
        console.log(error)
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
