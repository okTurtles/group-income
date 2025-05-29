/**
 * @fileoverview esbuild plugin to prefix Node.js built-in modules with the
 * 'node:' protocol.
 */
'use strict'

const { builtinModules } = require('node:module')

module.exports = (() => {
  // Since we use `resolve` internally, this prevents infinite loops
  const skipResolve = {}
  const builtInSet = new Set(builtinModules)
  const cache = new Map()

  return {
    name: 'nodeprotocol',
    setup (build) {
      // https://esbuild.github.io/plugins/#on-resolve
      build.onResolve({ filter: /./ }, async (args) => {
        const { path, resolveDir, pluginData, namespace, kind } = args

        // If this is the internal lookup below or if the path is not a built-in
        // module, return (i.e., skip this plugin)
        if (pluginData === skipResolve || !builtInSet.has(path)) return
        const cacheKey = `${kind}/${path}/${namespace}`
        if (cache.has(cacheKey)) return cache.get(cacheKey)

        // Attempt to resolve the module; this is to verify that it'll be
        // external
        const result = await build.resolve(path, {
          resolveDir,
          pluginData: skipResolve,
          kind,
          namespace
        })

        if (result.errors.length > 0) {
          return { errors: result.errors }
        }

        if (path === result.path && result.external) {
          const resolveResult = {
            ...result,
            // Add protocol prefix
            path: `node:${path}`
          }
          cache.set(cacheKey, resolveResult)
          return resolveResult
        }
      })
    }
  }
})()
