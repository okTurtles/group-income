const nargs = /\{([0-9a-zA-Z_]+)\}/g

export default function template (string /*: string */, ...args /*: any[] */) /*: string */ {
  const firstArg = args[0]
  // If the first rest argument is a plain object or array, use it as replacement table.
  // Otherwise, use the whole rest array as replacement table.
  const replacementsByKey = (
    (typeof firstArg === 'object' && firstArg !== null)
      ? firstArg
      : args
  )

  return string.replace(nargs, function replaceArg (match, capture, index) {
    // Avoid replacing the capture if it is escaped by double curly braces.
    if (string[index - 1] === '{' && string[index + match.length] === '}') {
      return capture
    }

    const maybeReplacement = (
      // Avoid accessing inherited properties of the replacement table.
      // $FlowFixMe
      Object.prototype.hasOwnProperty.call(replacementsByKey, capture)
        ? replacementsByKey[capture]
        : undefined
    )

    if (maybeReplacement === null || maybeReplacement === undefined) {
      return ''
    }
    return String(maybeReplacement)
  })
}
