const locale = navigator.languages ? navigator.languages[0] : navigator.language

export function humanDate (datems = Date.now(), opts = {}) {
  return new Date(datems).toLocaleDateString(locale, opts)
}
