import { marked } from 'marked'

marked.use({
  extensions: [
    {
      name: 'em',
      level: 'inline',
      renderer (token) {
        // custom renderer that converts *content* into <strong>content</strong>.
        // (reference: https://marked.js.org/using_pro#renderer)

        const rawTxt = token.raw
        const content = token.text
        return /^\*.+\*$/.test(rawTxt)
          ? `<strong>${content}</strong>`
          : `<em>${content}</em>`
      }
    },
    {
      name: 'link',
      level: 'inline',
      renderer (token) {
        // custom renderer for <a> tag for setting target='_blank' to the output HTML
        return `<a href='${token.href}' target='_blank'>${token.text}</a>`
      }
    }
  ]
})

export function convertToMarkdown (str: string): any {
  let converted = marked.parse(str, {})

  // remove unecessary line-breaks from the converted markdown outcome.
  converted = converted.replace(/^\s+|\s+$/g, '')
    .replace(/>\s+</g, '><')

  // if the original string doesn't have a line-break within it,
  // the converted outcome doesn't need to be wrapped with <p></p>.
  if (!str.includes('\n')) {
    converted = converted.replace(/^<p>|<\/p>$/g, '')
  }

  return converted
}

export function injectOrStripSpecialChar (
  // This function either injects or removes special character(e.g. *, ~, _ etc) for a certain type of markdown to a selected segment within a string.
  str: string, // A target string.
  type: string, // type of markdown needed to inject.
  startIndex: number, // start position of the target segment.
  endIndex: number // end position of the target segment.
): any {
  const charMap = {
    'bold': '*',
    'italic': '_',
    'code': '`',
    'strikethrough': '~'
  }
  let segment = str.slice(startIndex, endIndex)
  let before = str.slice(0, startIndex)
  let after = str.slice(endIndex)
  const specialChar = charMap[type]

  if (!specialChar) {
    return { output: str, focusIndex: str.length }
  }

  if (before.endsWith(specialChar) && after.startsWith(specialChar)) {
    // Stripping condition No 1. - when the selected segment is already wrapped with the special character.
    before = before.slice(0, before.length - 1)
    after = after.slice(1)
  } else if (segment.startsWith(specialChar) && segment.endsWith(specialChar)) {
    // Stripping condition No 2. - when the selected segment itself contains the special character at both start/end of the string.
    segment = segment.slice(1, segment.length - 1)
  } else {
    // Otherwise, let's wrap the selected segment with the speical character.
    segment = `${specialChar}${segment}${specialChar}`
  }

  const output = before + segment + after
  const focusIndex = (before + segment).length
  return { output, focusIndex }
}

export function injectOrStripLink (
  str: string, // A target string.
  startIndex: number, // start position of the target segment.
  endIndex: number // end position of the target segment.
): any {
  let segment = str.slice(startIndex, endIndex)
  let before = str.slice(0, startIndex)
  let after = str.slice(endIndex)
  let focusIndex

  // Firstly, check if the selected segment is in the conditions to strip the link out.
  // Stripping condition No 1.
  if (before.endsWith('[') && /^\]\(.+\)/.test(after)) {
    before = before.slice(0, before.length - 1)
    after = after.replace(/^\]\(.+\)/, '')
    focusIndex = {
      start: (before + segment).length,
      end: (before + segment).length
    }
  } else if (/^\[(.*)\]\(.+\)$/.test(segment)) {
    segment = segment.replace(/^\[(.*)\]\(.+\)$/, '$1')
    focusIndex = {
      start: (before + segment).length,
      end: (before + segment).length
    }
  } else {
    // Otherwise, inject the link
    segment = `[${segment}](url)`
    focusIndex = {
      start: (before + segment).length - 4,
      end: (before + segment).length - 1
    }
  }

  return {
    output: before + segment + after, focusIndex
  }
}
