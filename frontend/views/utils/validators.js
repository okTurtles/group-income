// Only allows non-empty strings of plain ASCII letters and digits.
export const alphanumeric = (value: string): boolean => /^[A-Za-z\d]+$/.test(value)

// Same as `alphanumeric`, but also allows accented letters from the first 256 Unicode code points.
export const alphanumericLatin = (value: string): boolean => /^[A-Za-zÀ-ÖØ-Ýà-öø-ÿ\d]+$/.test(value)

// Same as `alphanumeric`, but also allows hyphens.
export const alphanumericOrHyphens = (value: string): boolean => /^[A-Za-z\d-]+$/.test(value)

// Same as `alphanumericLatin`, but also allows hyphens.
export const alphanumericLatinOrHyphens = (value: string): boolean => /^[A-Za-zÀ-ÖØ-Ýà-öø-ÿ\d-]+$/.test(value)

export const noConsecutiveHyphens = (value: string): boolean => !value.includes('--')

export const noLeadingOrTrailingHyphen = (value: string): boolean => !value.startsWith('-') && !value.endsWith('-')

export const nonWhitespace = (value: string): boolean => /^\S+$/.test(value)

export const decimals = (digits: number): ((value: number) => boolean) => (value: number) => Number.isInteger(value * Math.pow(10, digits))

export const noUppercase = (value: string): boolean => value.toLowerCase() === value
