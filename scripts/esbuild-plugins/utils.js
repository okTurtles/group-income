/* eslint-disable require-await */
'use strict'

const { dirname, join, relative } = require('path')
const { promises } = require('fs')

const chalk = require('chalk')

const chalkFileEvent = (eventName, filePath) => {
  return chalk`{green file event:} '${eventName}' {green detected on} ${filePath}`
}

const chalkLintingTime = (dt, linters, filePaths) => {
  const linterNames = linters.map(linter => linter.name)
  const whatHasBeenLinted = (
    filePaths.length === 1 ? filePaths[0] : `${filePaths.length} files`
  )
  return chalk`{green ${linterNames.join(', ')}:} linted ${whatHasBeenLinted} {green in} ${formatElapsedTime(dt)}s`
}

const escapeForRegExp = (string) => {
  return string.replace(/[.*+?^${}()|\\[\]]/g, '\\$&')
}

const fileCache = new Map()

const formatElapsedTime = (dt) => (dt / 1e3).toFixed(1)

const readFileUsingCache = async (filename) => {
  const stats = await promises.stat(filename)

  if (!stats.isFile()) {
    throw new Error(`Not a file: ${filename}.`)
  }
  const { mtimeMs } = stats
  const cachedInfo = fileCache.get(filename)

  // Update the cache if the given file entry is missing or outdated.
  if (!cachedInfo || mtimeMs > cachedInfo.mtimeMs) {
    console.debug('Reading from disk')
    const contents = await promises.readFile(filename, 'utf8')

    console.debug('Updating file cache')
    fileCache.set(filename, { mtimeMs, contents })
    return contents
  }
  // Return cached contents it the given file entry was up-to-date.
  console.debug('Reading from cache')
  return cachedInfo.contents
}
// readFileUsingCache("./Gruntfile.js").then(code => console.log(code.length))

const updateFileCache = (filename, contents, mtimeMs = Date.now()) => {
  const entryValue = fileCache.get(filename)

  if (entryValue) {
    entryValue.contents = contents
    entryValue.mtimeMs = mtimeMs
  } else {
    fileCache.set(filename, { contents, mtimeMs })
  }
}

/**
 * Creates an alias replacement function from a mapping of path aliases, to be
 * used in import statements, import expressions and at-import rules.
 *
 * - See `createFilterRegExpFromAliases()`.
 *
 * @param {Object} aliases
 * @returns {Function}
 */
exports.createAliasReplacer = (aliases) => {
  if (Object.keys(aliases).some(alias => alias.includes('/'))) {
    throw new Error('Path aliases may not include slash characters.')
  }
  const cwd = process.cwd()
  const escapedAndSortedAliases = Object.keys(aliases).map(escapeForRegExp).sort().reverse()
  const re = new RegExp(
    `(?:^import[ (]|\\bimport[ (]|import .+? from |^\\} from )['"](${escapedAndSortedAliases.join('|')})(?:['"]|/[^"']+?["'])`,
    'gm'
  )

  return function aliasReplacer ({ path, source }) {
    const relativeDirPath = relative(dirname(path), cwd)

    return source.replace(re, (match, capture) => {
      const resolvedPathSegment = aliases[capture]
      const replacement = join(relativeDirPath, resolvedPathSegment)

      return match.replace(capture, replacement)
    })
  }
}

/**
 * Creates a filtering regular expression from an array of path aliases.
 *
 * - Sort aliases in reverse order to avoid possible shadowing between e.g.
 * 'view' and 'view-utils'.
 * - Append a choice between the slash character and EOF to make sure to only
 * match whole import paths or their initial segment.
 *
 * @param {string[]} aliases
 * @returns {RegExp}
 */
exports.createFilterRegExpFromAliases = (aliases) => {
  if (aliases.some(alias => alias.includes('/'))) {
    throw new Error('Path aliases may not include slash characters.')
  }
  return new RegExp(`^(${aliases.map(escapeForRegExp).sort().reverse().join('|')})(/|$)`)
}

exports.createEslinter = (options = {}) => {
  const {
    format = 'stylish',
    throwOnError = false,
    throwOnWarning = false
  } = options

  const { CLIEngine } = require('eslint')
  const cli = new CLIEngine()
  const formatter = cli.getFormatter(format)

  return {
    name: 'eslint',

    /**
     * Lints some source code with ESLint.
     *
     * @param {string} code
     * @param {string} [filename]
     */
    async lintCode (code, filename = '') {
      const report = cli.executeOnText(code, filename)

      const { errorCount, results, warningCount } = report

      if (!errorCount && !warningCount) {
        return
      }
      const output = formatter(results)

      if (output) {
        console.log(output)
      }
      if (errorCount && (throwOnError || throwOnWarning)) {
        throw new Error('Errors were found.')
      }
      if (warningCount && throwOnWarning) {
        throw new Error('Warnings were found.')
      }
    }
  }
}

exports.createPuglinter = (options = {}) => {
  const Linter = require('pug-lint-vue/lib/linter')
  const linter = new Linter(options)

  return {
    name: 'puglint',

    /**
     * Lints the contents of a .vue file with pug-lint-vue.
     *
     * @param {string} code
     * @param {string} [filename]
     */
    async lintCode (code, filename = '') {
      linter.lintErrors.length = 0
      linter.checkString(code, filename)
    }
  }
}

exports.createStylelinter = (options = {}) => {
  const {
    throwOnError = false,
    throwOnWarning = false
  } = options
  const stylelint = require('stylelint')

  return {
    name: 'stylelint',

    /**
     * Lints some source code with stylelint.
     *
     * @param {string} code
     */
    async lintCode (code) {
      // https://github.com/stylelint/stylelint/blob/master/docs/user-guide/usage/node-api.md
      await stylelint.lint({ ...options, code }).then(({
        errored,
        output,
        maxWarningsExceeded,
        postcssResults,
        results
      }) => {
        const foundWarnings = maxWarningsExceeded ? maxWarningsExceeded.foundWarnings : 0

        if (errored || foundWarnings) {
          console.log(output)
        }
        if (errored && throwOnError) {
          throw new Error('Errors were found.')
        }
        if (foundWarnings && throwOnWarning) {
          throw new Error('Warnings were found.')
        }
      })
    }
  }
}

exports.formatElapsedTime = formatElapsedTime
exports.chalkFileEvent = chalkFileEvent
exports.chalkLintingTime = chalkLintingTime
exports.readFileUsingCache = readFileUsingCache
exports.updateFileCache = updateFileCache
