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
        const { result /*, usedFiles */ } = await compile({ filename, source, options: { flowtype } })

        if (cache) cache.set(filename, result)
        return result
      })
    }
  }
}

let requireDepth = 0
let usedFiles = new Set()

editModule('fs', (fs) => {
  fs.readFileSync = new Proxy(fs.readFileSync, {
    apply (target, thisArg, args) {
      if (usedFiles && requireDepth === 0) usedFiles.add(args[0])
      return Reflect.apply(target, thisArg, args)
    }
  })
})

editModule('module', (mod) => {
  mod.prototype.require = new Proxy(mod.prototype.require, {
    apply (target, thisArg, args) {
      requireDepth++
      try {
        return Reflect.apply(target, thisArg, args)
      } finally {
        requireDepth--
      }
    }
  })
})

const compiler = componentCompiler.createDefaultCompiler()
const compile = ({ filename, source, options }) => {
  usedFiles = new Set()

  try {
    if (/^\s*$/.test(source)) {
      throw new Error('File is empty')
    }
    const result = compiler.compileToDescriptor(filename, source)
    const resultErrors = combineErrors(result.template, ...result.styles)
    if (resultErrors.length > 0) {
      return { result: { errors: resultErrors }, usedFiles }
    }
    if (options.flowtype) {
      result.script.code = flowRemoveTypes(result.script.code, options.flowtype).toString()
    }
    const output = componentCompiler.assemble(compiler, source, result, {})
    return { result: { contents: output.code }, usedFiles }
  } catch (error) {
    return {
      result: {
        errors: [
          {
            text: `Could not compile Vue single-file component: ${error}`,
            detail: error
          }
        ]
      },
      usedFiles
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

function editModule (name, fn) {
  fn(require(name))
}
