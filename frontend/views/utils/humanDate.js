export function humanDate (datems, opts = {}) {
  const date = new Date(datems)
  const locale = navigator.languages ? navigator.languages[0] : navigator.language
  return date.toLocaleDateString(locale, opts)
}
