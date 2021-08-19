'use strict'

const { dirname, join, relative } = require('path')

const escapeForRegExp = (string) => {
  return string.replace(/[.*+?^${}()|\\[\]]/g, '\\$&')
}

/**
 * Creates an alias replacement function from an array of path aliases, to be
 * used in at-import rules.
 *
 * - See `createFilterRegExpFromAliases()`.
 *
 * @param {string[]} aliases
 * @returns {RegExp}
 */
exports.createAliasReplacer = (aliases) => {
  if (Object.keys(aliases).some(alias => alias.includes('/'))) {
    throw new Error('Path aliases may not include slash characters.')
  }
  const escapedAndSortedAliases = Object.keys(aliases).map(escapeForRegExp).sort().reverse()
  const re = new RegExp(`@import ['"](${escapedAndSortedAliases.join('|')})(?:['"]|/[^"']+?["'])`, 'g')

  return function aliasReplacer ({ path, source }) {
    const relativeDirPath = relative(dirname(path), process.cwd())

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
