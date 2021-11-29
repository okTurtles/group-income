// Modified from https://github.com/apeschar/esbuild-vue to remove the Piscina dependency
// and add path aliasing support in at-import rules.
'use strict'

const { readFile } = require('fs').promises
const { relative } = require('path')

// https://github.com/vuejs/vue-component-compiler#api
const componentCompiler = require('@vue/component-compiler')
const flowRemoveTypes = require('flow-remove-types')

const { createAliasReplacer } = require('./utils')

/**
 * @param {Object} [options.aliases]
 * @param {Map} [options.cache]
 * @param {boolean} [options.debug]
 * @param {Object} [options.flowtype] Options for `flow-remove-types`.
 * Leave it out to disable Flowtype syntax support.
 * @returns {Object}
 */
module.exports = ({ aliases = null, cache = null, debug = false, flowtype = null } = {}) => {
  const aliasReplacer = aliases ? createAliasReplacer(aliases) : null

  return {
    name: 'vue',
    setup (build) {
      build.onLoad({ filter: /[^/]\.vue$/ }, async ({ path }) => {
        const filename = relative(process.cwd(), path)
        if (cache && cache.has(filename)) {
          if (debug) console.log('vue plugin: reading from cache:', filename)
          return cache.get(filename)
        }
        const source = await readFile(path, 'utf8')
          .then(source => aliasReplacer ? aliasReplacer({ path, source }) : source)

        if (debug) console.log('vue plugin: compiling', filename)
        const result = await compile({ filename, source, options: { flowtype } })

        if (cache) cache.set(filename, result)
        return result
      })
    }
  }
}

const compiler = componentCompiler.createDefaultCompiler()
const compile = ({ filename, source, options }) => {
  try {
    if (/^\s*$/.test(source)) {
      throw new Error('File is empty')
    }
    const descriptor = compiler.compileToDescriptor(filename, source)
    const errors = combineErrors(descriptor.template, ...descriptor.styles)
    if (errors.length > 0) {
      return { errors }
    }
    if (options.flowtype) {
      descriptor.script.code = flowRemoveTypes(descriptor.script.code, options.flowtype).toString()
    }
    const output = componentCompiler.assemble(compiler, source, descriptor, {})
    return { contents: output.code }
  } catch (error) {
    return {
      errors: [
        {
          text: `Could not compile Vue single-file component: ${error}`,
          detail: error
        }
      ]
    }
  }
}

function combineErrors (...outputs) {
  return outputs.map((output) => {
    if (!output || !output.errors) {
      return []
    }
    return output.errors.map((error) => convertError(error))
  }).flat()
}

function convertError (error) {
  if (typeof error === 'string') {
    return { text: error }
  }
  if (error instanceof Error) {
    return { text: error.message }
  }
  throw new Error(`Cannot convert Vue compiler error: ${error}`)
}
