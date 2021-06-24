'use strict'

const assert = require('assert')

/*
 * Imports a version of Acorn which supports object rest properties,
 * allowing to parse `:args` attributes containing `LTags()` calls.
 *
 * Note that pug-lint already exposes an useful `addErrorWithAcorn()` function,
 * but it is currently using an outdated version of Acorn which does not
 * support object rest properties.
 */
const acorn = require('acorn')
const utils = require('pug-lint/lib/utils')

const link = 'https://github.com/okTurtles/group-income-simple/pull/727'

const INVALID_HTML_TAGNAME = 'The `LTags()` function should not be called with invalid HTML tag names'
const SINGLE_EXPRESSION_REQUIRED = 'The `:args` attribute must be a single expression'
const STRING_LITERAL_REQUIRED = 'The `LTags()` function should only be called with static string literals'
const UNEXPECTED_COMPUTED_PROPERTY = 'Computed properties are not allowed in the `:args` attribute'
const UNEXPECTED_EXPRESSION_TYPE = 'The `:args` attribute value must represent an object'
const UNEXPECTED_HTML_ATTRIBUTE = `The html attribute in i18n tags is deprecated. See ${link}`
const UNEXPECTED_KEY_TYPE = 'Only plain identifiers are allowed as property keys in the `:args` attribute'
const UNEXPECTED_METHOD = 'Methods are not allowed in the `:args` attribute'
const UNEXPECTED_PROPERTY_TYPE = 'An object literal used in the `:args` attribute can only have plain properties and `LTags()` rest properties'
const UNEXPECTED_SPREAD_ELEMENT = 'The spread operator is not allowed in the `:args` attribute, unless it applies to an `LTags()` call'
const UNEXPECTED_VARIABLE = 'Double curly braces (Vue.js variables) are not allowed in i18n strings. Use single braces in the `:args` attribute to pass in variables'
const UNEXPECTED_VHTML_DIRECTIVE = 'The `v-html` is no longer allowed out of safety concern. Please use `v-safe-html` instead.'

/**
 * Unquotes a string, taking care of unescaping the escaped quotes it may
 * contain.
 *
 * @param {string} str
 * @returns {string}
 */
function unquote (str) {
  const quote = str[0]

  return (
    quote === '\''
      ? str.slice(1, -1).replace(/\\'/g, quote)
      : quote === '"'
        ? str.slice(1, -1).replace(/\\"/g, quote)
        : str
  )
}

/**
 * Checks if a string is a valid JavaScript identifier name.
 *
 * - This only recognizes ASCII identifier names.
 * @param {string} str
 * @returns {boolean}
 */
function isIdentifierName (str) {
  return !/^\d|[^\w$]/.test(str)
}

function isLTagsCallExpression (node) {
  return (
    node &&
    node.type === 'CallExpression' &&
    node.callee &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'LTags'
  )
}

function isQuotedString (arg) {
  return (
    typeof arg === 'string' &&
    (arg[0] === '\'' || arg[0] === '"') &&
    arg[arg.length - 1] === arg[0]
  )
}

/**
 * Finds placeholder names that were provided via an `LTags()` invocation and
 *    returns them, along with any linting errors.
 *
 * @param {object} ltagsNode - A 'CallExpression' AST node representing a call
 *   to the `LTags()` function.
 * @returns {{names: string[], errors: string[]}}
 */
function listNamesInLTagsNode (ltagsNode) {
  const errors = []
  // The 'br_' name is included by default in LTags()' return value.
  const names = ['br_']

  for (const argument of ltagsNode.arguments) {
    // Every argument provides a pair or names representing a pair of HTML tags.
    if (argument.type === 'Literal') {
      const ltag = argument.value

      if (!isIdentifierName(ltag)) {
        errors.push(INVALID_HTML_TAGNAME)
      }
      // Add the opening tag first.
      names.push(ltag + '_')
      names.push('_' + ltag)
    } else {
      errors.push(STRING_LITERAL_REQUIRED)
    }
  }
  return { names, errors }
}

/**
 * Finds placeholder names that were provided via the `:args` attribute.
 *
 * @param {string} argsValue
 * @returns {{names: string[], errors: string[]}}
 */
function listProvidedNames (argsValue) {
  if (!argsValue) return { names: [], errors: [] }
  // Attribute values in Pug are allowed to contain line continuations
  //   (a backslash followed by a newline),
  //   so we have to unescape them before passing the value to the JS parser.
  const source = unescapeLineContinuations(unquote(argsValue).trim())
  const { node, errors } = parseExpression(source)

  if (!node) return { names: [], errors }

  if (node.type === 'ObjectExpression') {
    const propertyNames = []
    const propertyNodes = node.properties

    for (const propertyNode of propertyNodes) {
      switch (propertyNode.type) {
        case 'Property': {
          if (propertyNode.computed) {
            errors.push(UNEXPECTED_COMPUTED_PROPERTY)
          }
          if (propertyNode.method) {
            errors.push(UNEXPECTED_METHOD)
          }

          const { key } = propertyNode

          if (key.type === 'Identifier') {
            propertyNames.push(key.name)
          } else if (key.type === 'Literal') {
            propertyNames.push(String(key.value))
          } else {
            errors.push(UNEXPECTED_KEY_TYPE)
          }
          break
        }
        case 'SpreadElement': {
          const { argument } = propertyNode

          if (!isLTagsCallExpression(argument)) {
            errors.push(UNEXPECTED_SPREAD_ELEMENT)
            break
          }
          const { names, errors: errorsInLTags } = listNamesInLTagsNode(argument)
          errorsInLTags.forEach(err => errors.push(err))
          names.forEach(name => propertyNames.push(name))
          break
        }
        default: {
          errors.push(UNEXPECTED_PROPERTY_TYPE)
        }
      }
    }
    return { names: propertyNames, errors }
  }

  if (node.type === 'CallExpression') {
    const { names, errors: errorsInLTags } = listNamesInLTagsNode(node)

    errorsInLTags.forEach(err => errors.push(err))
    return { names, errors }
  }

  if (node.type === 'Identifier') {
    return { names: [], errors }
  }
  errors.push(UNEXPECTED_EXPRESSION_TYPE)
}

/**
 * Finds placeholder names in a given i18n string.
 *
 * @param {string} str
 * @returns {string[]}
 *
 * @example listUsedNames('Hello {name}, how are you?') // -> [ 'name' ]
 */
function listUsedNames (str) {
  const names = []
  const nargs = /\{([0-9a-zA-Z_]+)\}/g

  for (const match of str.matchAll(nargs)) {
    const { index } = match
    const capture = match[1]

    if (str[index - 1] === '{' && str[index + capture.length + 1] === '}') {
      continue
    }
    names.push(capture)
  }
  return names
}

/**
 * Parses the value of an `:args` attribute and returns the corresponding AST
 *   along with any errors.
 *
 * @param {string} source
 * @returns {{node: (Object | undefined), errors: string[]}}
 */
function parseExpression (source) {
  const errors = []
  let node

  try {
    node = acorn.parseExpressionAt(source, 0, { ecmaVersion: 2020 })

    // This should never happen unless Acorn behaves in an unexpected way.
    if (!node) {
      throw new TypeError('Acorn returned a falsy value')
    }
    // Checks if the whole source string was matched as a single expression.
    if (node.end - node.start !== source.length) {
      errors.push(SINGLE_EXPRESSION_REQUIRED)
    }
  } catch (error) {
    errors.push(error.message)
  }
  return { node, errors }
}

function unescapeLineContinuations (str) {
  return str.replace(/\\\n/g, '\n')
}

module.exports = function () {}

module.exports.prototype = {
  name: 'validateI18n',

  schema: {
    enum: [null, true]
  },

  configure: function (options) {
    utils.validateTrueOptions(this.name, options)
  },

  lint: function (file, errors) {
    file.iterateTokensByType('tag', function (token) {
      if (token.val !== 'i18n') {
        return
      }

      let nextToken = file.getNextToken(token)

      // Skip class tokens.
      while (nextToken && nextToken.type === 'class') {
        nextToken = file.getNextToken(nextToken)
      }

      // Collects the attribute tokens.
      const attributeTokens = []

      if (nextToken && nextToken.type === 'start-attributes') {
        nextToken = file.getNextToken(nextToken)

        while (nextToken && nextToken.type === 'attribute') {
          attributeTokens.push(nextToken)
          nextToken = file.getNextToken(nextToken)
        }
        // The next token should be an 'end-attributes' token.
        assert.equal(nextToken && nextToken.type, 'end-attributes')
        nextToken = file.getNextToken(nextToken)
      }

      // Checks if the html attribute was used.
      attributeTokens.forEach(token => {
        if (token.name === 'html' || token.name === ':html') {
          errors.add(UNEXPECTED_HTML_ATTRIBUTE, token.line, token.col)
        } else if (token.name === 'v-html') {
          errors.add(UNEXPECTED_VHTML_DIRECTIVE, token.line, token.col)
        }
      })
      const argsToken = attributeTokens.find(token => token.name === ':args')
      const argsValue = argsToken ? argsToken.val : ''

      /*
       * If an identifier name was provided, like in `:args='status'`,
       *   then it is not feasible to statically verify if the placeholder
       *   names match; so we might as well return early.
       */
      if (isQuotedString(argsValue) && isIdentifierName(argsValue.slice(1, -1))) {
        return
      }

      // Skip indent tokens.
      while (nextToken && nextToken.type === 'indent') {
        nextToken = file.getNextToken(nextToken)
      }

      // The following token should be a text token.
      if (!nextToken || nextToken.type !== 'text') {
        const { end } = nextToken ? nextToken.loc : token.loc

        errors.add(
          'A pug string was expected after this i18n tag',
          end.line,
          end.column
        )
        return
      }
      const i18nString = nextToken.val.trim()
      const textToken = nextToken
      const usedNames = listUsedNames(i18nString)

      /**
       * Double braces (Vue.js variables) are not allowed in i18n strings.
       * Developers should instead use single braces in the `:args` attribute
       * to pass in variables.
       *
       * @see https://github.com/okTurtles/group-income-simple/issues/1027
       */
      if (i18nString.includes('{{')) {
        errors.add(
          UNEXPECTED_VARIABLE,
          textToken.line,
          textToken.column
        )
      }
      const {
        names: providedNames,
        errors: errorsInArgsValue
      } = listProvidedNames(argsValue)

      errorsInArgsValue.forEach(
        error => errors.add(error, argsToken.line, argsToken.col)
      )

      for (const name of new Set(usedNames)) {
        if (!providedNames.includes(name)) {
          errors.add(
            `Undefined named argument '${name}'. It was not found in the :args attribute`,
            textToken.line,
            textToken.col
          )
        }
      }
      for (const name of new Set(providedNames)) {
        // The 'br_' name is always implicitly provided by any `LTags()` call,
        //   so it's not an error if it's unused.
        if (name !== 'br_' && !usedNames.includes(name)) {
          errors.add(
            `Unused named argument '${name}'. It was not found in the i18n string`,
            argsToken.line,
            argsToken.col
          )
        }
      }
    })
  }
}
