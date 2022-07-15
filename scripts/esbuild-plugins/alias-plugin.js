/**
 * @fileoverview esbuild plugin to process aliases in import paths.
 *
 * - Aliases can match either whole import path, or just the first segment of an
 *   import path.
 * - Aliases may be specified in any order.
 * - Aliases should not contain any slash character.
 */
'use strict'

const { resolve } = require('path')

const { createFilterRegExpFromAliases } = require('./utils.js')

module.exports = ({ entries = {} } = {}) => {
  const aliases = Object.keys(entries)
  const filter = createFilterRegExpFromAliases(aliases)

  return {
    name: 'alias',
    setup (build) {
      // https://esbuild.github.io/plugins/#on-resolve
      build.onResolve({ filter }, (args) => {
        const { path } = args
        const external = build.initialOptions.external?.map(s => {
          return new RegExp(s.replace('.', '\\.').replace('*', '.*'))
        })
        const namespace = path.endsWith('.scss') ? 'sass' : 'file'
        // if this alias is marked as external for this build, don't resolve it
        if (external?.some(x => x.test(path))) {
          return { external: true }
        }
        // Was the whole path matched ?
        if (typeof entries[path] === 'string') {
          const alias = path
          return {
            namespace,
            path: resolve(entries[alias])
          }
        } else {
          // Otherwise, only the first path segment was matched.
          const [alias, ...rest] = path.split('/')
          return {
            namespace,
            path: resolve(entries[alias], ...rest)
          }
        }
      })
    }
  }
}
