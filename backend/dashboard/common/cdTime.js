export function humanDate (
  date: number | Date | string,
  options?: Intl$DateTimeFormatOptions = { month: 'short', day: 'numeric' }
): string {
  const locale = typeof navigator === 'undefined'
    // Fallback for Mocha tests.
    ? 'en-US'
    // Flow considers `navigator.languages` to be of type `$ReadOnlyArray<string>`,
    // which is not compatible with the `string[]` expected by `.toLocaleDateString()`.
    // Casting to `string[]` through `any` as a workaround.
    : ((navigator.languages: any): string[]) ?? navigator.language
  // NOTE: `.toLocaleDateString()` automatically takes local timezone differences into account.
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
  return new Date(date).toLocaleDateString(locale, options)
}
