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

const { createFilterRegExpFromAliases } = require('./utils')

module.exports = ({ entries = {} } = {}) => {
  const aliases = Object.keys(entries)
  const filter = createFilterRegExpFromAliases(aliases)

  return {
    name: 'alias',
    setup (build) {
      build.onResolve({ filter }, (args) => {
        const { path } = args
        const namespace = path.endsWith('.scss') ? 'sass' : 'file'
        // Was the whole path matched ?
        if (typeof entries[path] === 'string') {
          const alias = path
          return {
            namespace,
            path: resolve(entries[alias])
          }
        }
        // Otherwise, only the first path segment was matched.
        const [alias, ...rest] = path.split('/')
        return {
          namespace,
          path: resolve(entries[alias], ...rest)
        }
      })
    }
  }
}
