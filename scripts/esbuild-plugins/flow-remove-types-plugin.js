'use strict'

const { readFile } = require('fs').promises
const { relative } = require('path')

const flowRemoveTypes = require('flow-remove-types')

module.exports = (options = {}) => {
  return {
    name: 'flow-remove-types',
    setup (build) {
      const cwd = process.cwd()

      build.onLoad({ filter: /\.js$/ }, async ({ path }) => {
        if (path.includes('node_modules')) return

        const { cache } = options
        const filename = relative(cwd, path)

        if (cache && cache.has(filename)) {
          return {
            contents: cache.get(filename),
            loader: 'js'
          }
        }
        const sourceCode = await readFile(path, 'utf8')
        const outputCode = flowRemoveTypes(sourceCode, options).toString()

        if (cache) {
          cache.set(filename, outputCode)
        }
        return {
          contents: outputCode,
          loader: 'js'
        }
      })
    }
  }
}
