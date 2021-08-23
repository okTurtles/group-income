'use strict'

const { readFile } = require('fs').promises

const flowRemoveTypes = require('flow-remove-types')

module.exports = (options = {}) => {
  return {
    name: 'flow-remove-types',
    setup (build) {
      build.onLoad({ filter: /\.js$/ }, async ({ path }) => {
        if (path.includes('node_modules')) return

        const sourceCode = await readFile(path, 'utf8')
        const outputCode = flowRemoveTypes(sourceCode, options).toString()

        return {
          contents: outputCode,
          loader: 'js'
        }
      })
    }
  }
}
