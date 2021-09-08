'use strict'

const path = require('path')
const { readFile } = require('fs').promises

const compiler = require('vue-template-compiler')
const transpile = require('vue-template-es2015-compiler')

/**
 * Based on "rollup-plugin-vue-inline-svg" but better:
 * - Fix sourcemaps bug on original plugin.
 * - Remove useless attributes and add global CSS class.
 *
 * @param {Map} [options.cache]
 * @param {boolean} [options.debug]
 * @returns {Object}
 */
module.exports = ({ cache = null, debug = false } = {}) => {
  return {
    name: 'vue-inline-svg',
    setup (build) {
      build.onLoad({ filter: /[^/]\.svg$/ }, async (args) => {
        const resolvedPath = args.path

        if (cache && cache.has(resolvedPath)) {
          if (debug) {
            console.log('vue-inline-svg plugin: reading from cache')
          }
          return {
            contents: cache.get(resolvedPath),
            loader: 'js'
          }
        }
        const source = await readFile(resolvedPath, 'utf8')
        const svgName = path.basename(resolvedPath, '.svg')
        const svgClass = `svg-${svgName}`

        // Add global class automatically for theming customization.
        const svg = source.replace('<svg', `<svg class="${svgClass}"`)
        const compiled = compiler.compile(svg, { preserveWhitespace: false })
        const transpiledCode = transpile(`module.exports = { render: function () { ${compiled.render} } };`)
          // convert to ES6 modules
          .replace('module.exports =', 'export default')

        if (cache) {
          cache.set(resolvedPath, transpiledCode)
        }
        return {
          contents: transpiledCode,
          loader: 'js'
        }
      })
    }
  }
}
