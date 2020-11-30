const nargs = /\{([0-9a-zA-Z_]+)\}/g

export default function template (string: string = '') {
  let args

  if (arguments.length === 2 && typeof arguments[1] === 'object') {
    args = arguments[1]
  } else {
    args = new Array(arguments.length - 1)
    for (let i = 1; i < arguments.length; ++i) {
      args[i - 1] = arguments[i]
    }
  }

  if (!args || !args.hasOwnProperty) {
    args = {}
  }

  return string.replace(nargs, function replaceArg (match, i, index) {
    let result

    if (string[index - 1] === '{' &&
      string[index + match.length] === '}') {
      return i
    } else {
      // TODO: find out and fix this eslint error
      // "Do not access Object.prototype method 'hasOwnProperty' from target object  no-prototype-builtins"
      // eslint-disable-next-line
      result = args.hasOwnProperty(i) ? args[i] : null
      if (result === null || result === undefined) {
        return ''
      }

      return result
    }
  })
}
