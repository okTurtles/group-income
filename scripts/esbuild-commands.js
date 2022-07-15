'use strict'

const chalk = require('chalk')
const esbuild = require('esbuild')

/**
 * @param {Object} esbuildOptions - Native esbuild options.
 * @param {Object} otherOptions - Additional options that are not part of the esbuild API.
 * @returns {Object}
 */
const createEsbuildTask = (esbuildOptions = {}, otherOptions = {}) => {
  const { postoperation } = otherOptions

  if (!esbuildOptions.plugins) esbuildOptions.plugins = []

  // Make sure our 'default' plugin is always included.
  esbuildOptions.plugins.push(defaultPlugin)

  return {
    // Internal state.
    state: {
      // Holds the latest esbuild result object.
      result: null
    },

    // Used to do initial builds as well as rebuilds after an input file event has been detected.
    async run ({ fileEventName, filePath } = {}) {
      const { state } = this

      if (!state.result || !esbuildOptions.incremental) {
        if (fileEventName || filePath) {
          throw new Error('No argument should be provided when first running this task.')
        }
        state.result = await esbuild.build(esbuildOptions)
      } else {
        if (!fileEventName || !filePath) {
          throw new Error('Arguments `fileEventName` and `filePath` must be provided when rerunning this task.')
        }
        await state.result.rebuild()
      }
      if (postoperation) {
        await postoperation({ fileEventName, filePath })
      }
    }
  }
}

// This plugin helps reducing code duplication between different build tasks.
const defaultPlugin = {
  name: 'default',
  setup (build) {
    const { entryPoints } = build.initialOptions
    const output = build.initialOptions.outdir || build.initialOptions.outfile
    // Will store the build or rebuild start timestamp, in milliseconds.
    let t0 = 0

    build.onStart(() => {
      console.log(chalk`{green esbuild:} ${entryPoints}`)
      t0 = Date.now()
    })

    build.onEnd((result) => {
      if (!result.errors.length) {
        const duration = Date.now() - t0
        console.log(chalk`{green esbuild: created} {bold ${output}} {green from} {bold ${entryPoints}} {green in} {bold ${(duration / 1e3).toFixed(1)}s}`)
      }
    })
  }
}

Object.assign(module.exports, {
  createEsbuildTask
})
