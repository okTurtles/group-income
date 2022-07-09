export const nonWhitespace = (value: string): boolean => /^\S+$/.test(value)

export const decimals = (digits: number): ((value: number) => boolean) => (value: number) => Number.isInteger(value * Math.pow(10, digits))

export const noUppercase = (value: string): boolean => /[^A-Z]+/i.test(value)
