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
      delayTimeoutID: 0,
      // Files where a linting task failed. Should only be used by linting plugins.
      failingFilenames: new Set(),
      // Holds the latest esbuild result object.
      result: null,
      // If true, calling run() will do nothing but schedule the task for later.
      running: false,
      // If true, the task will run or run again as soon as possible.
      scheduled: false,
      // The task cannot run while it is throttled, although it can be scheduled.
      throttled: false
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
    const entryPoint = build.initialOptions.entryPoints[0]
    const output = build.initialOptions.outdir || build.initialOptions.outfile
    const state = {
      result: null,
      t0: 0
    }

    build.onStart(() => {
      console.log(chalk`{green esbuild:} ${entryPoint}`)
      state.t0 = Date.now()
    })

    build.onEnd((result) => {
      state.result = result

      const duration = Date.now() - state.t0
      console.log(chalk`{green created} {bold ${output}} {green from} {bold ${entryPoint}} {green in} {bold ${(duration / 1e3).toFixed(1)}s}`)
    })
  }
}

Object.assign(module.exports, {
  createEsbuildTask
})
