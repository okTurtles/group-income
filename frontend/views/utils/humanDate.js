const locale = navigator.languages ? navigator.languages[0] : navigator.language

// TODO: move humanDate and everything associated with it into frontend/utils/time.js
//       and delete this file!
export function humanDate (datems = Date.now(), opts = {}) {
  return new Date(datems).toLocaleDateString(locale, opts)
}
