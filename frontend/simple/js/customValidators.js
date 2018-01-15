export const nonWhitespace = value => /^\S+$/.test(value)

export const decimals = digits => value => Number.isInteger(value * Math.pow(10, digits))
