// Matches strings of plain ASCII letters and digits, hyphens and underscores.
export const allowedUsernameCharacters = (value: string): boolean => /^[\w-]*$/.test(value)

// Matches non-empty strings of plain ASCII letters and digits.
export const alphanumeric = (value: string): boolean => /^[A-Za-z\d]+$/.test(value)

export const noConsecutiveHyphensOrUnderscores = (value: string): boolean => !value.includes('--') && !value.includes('__')

export const noLeadingOrTrailingHyphen = (value: string): boolean => !value.startsWith('-') && !value.endsWith('-')
export const noLeadingOrTrailingUnderscore = (value: string): boolean => !value.startsWith('_') && !value.endsWith('_')

export const decimals = (digits: number): ((value: number) => boolean) => (value: number) => Number.isInteger(value * Math.pow(10, digits))

export const noUppercase = (value: string): boolean => value.toLowerCase() === value

export const noWhitespace = (value: string): boolean => /^\S+$/.test(value)
