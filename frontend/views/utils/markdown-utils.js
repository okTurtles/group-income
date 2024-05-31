import sbp from '@sbp/sbp'
import { marked } from 'marked'
import { validateURL } from '@view-utils/misc.js'
import { TextObjectType } from '@utils/constants.js'

export const makeOnsiteRedirectElement = (data?: Object): {
  prefix: string, suffix: string
} => {
  return {
    prefix: `<span class="link" data="${JSON.stringify(data ?? {})}">`,
    suffix: '</span>'
  }
}

marked.use({
  extensions: [
    {
      name: 'link',
      level: 'inline',
      renderer (token) {
        const { isValid, url } = validateURL(token.href)
        if (isValid) {
          const { href, text } = token
          if (url.hostname === document.location.hostname) {
            const path = href.split(sbp('controller/router').options.base)[1]
            const { prefix, suffix } = makeOnsiteRedirectElement({ path })
            return `${prefix}${text}${suffix}`
          } else {
            // custom renderer for <a> tag for setting target='_blank' to the output HTML
            return `<a class="link" href="${href}" target="_blank">${text}</a>`
          }
        }
        return token.raw
      }
    }
  ]
})

export function renderMarkdown (str: string): any {
  str = str.replace(/\n/g, '<br>') // firstly, manually replace all new-lines with <br>. ("breaks: true" option below doesn't consistently work.)
    .replace(/<br>-/g, '\n-')

  let converted = marked.parse(str, { gfm: true, breaks: true })

  // remove unecessary line-breaks from the converted markdown outcome.
  converted = converted.replace(/^\s+|\s+$/g, '')

  // remove the unecessary starting/end line-breaks added to the blockquote.
  converted = converted.replace(/([a-z]+)>\n/g, '$1>')
    .replace(/\n<\/([a-z]+)>/g, '</$1>')

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
    'bold': '**',
    'italic': '_',
    'code': '`',
    'strikethrough': '~'
  }
  let segment = str.slice(startIndex, endIndex)
  let before = str.slice(0, startIndex)
  let after = str.slice(endIndex)
  let focusStart = startIndex
  let focusEnd = endIndex
  const specialChar = charMap[type]

  if (!specialChar) {
    return {
      output: str,
      focusIndex: { start: focusStart, end: focusEnd }
    }
  }

  if (before.endsWith(specialChar) && after.startsWith(specialChar)) {
    // Stripping condition No 1. - when the selected segment is already wrapped with the special character.
    const len = specialChar.length
    before = before.slice(0, before.length - len)
    after = after.slice(len)

    focusStart -= len
    focusEnd -= len * 2
  } else if (segment.startsWith(specialChar) && segment.endsWith(specialChar)) {
    // Stripping condition No 2. - when the selected segment itself contains the special character at both start/end of the string.
    const len = specialChar.length
    segment = segment.slice(len, segment.length - len)
    focusEnd -= len * 2
  } else {
    const len = specialChar.length
    // Otherwise, let's wrap the selected segment with the speical character.
    segment = `${specialChar}${segment}${specialChar}`
    focusEnd += len * 2
  }

  const output = before + segment + after
  return { output, focusIndex: { start: focusStart, end: focusEnd } }
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

export const filterOutOnsiteRedirectsFromSafeHTML = (textInSafeHTML: string): Array<Object> => {
  // NOTE: regular expressions we use in this function
  //       should be defined using response of makeOnsiteRedirectElement
  const onsiteRedirectElements = textInSafeHTML.match(/<span class="link" data="([^]*?)<\/span>/g)

  if (!onsiteRedirectElements) {
    return [{ type: TextObjectType.Text, text: textInSafeHTML }]
  } else {
    const objOnsiteRedirects = onsiteRedirectElements.map(ele => ({ ...JSON.parse(ele.split(/data="([^]*?)">/g)[1]), raw: ele }))
    const escapedRedirectElements = onsiteRedirectElements.map(ele => ele.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'))
    const splitPatternRegEx = new RegExp('(' + escapedRedirectElements.join('|') + ')')
    return textInSafeHTML.split(splitPatternRegEx).map(part => {
      if (!part) {
        return null
      } else {
        const index = objOnsiteRedirects.findIndex(obj => obj.raw === part)
        if (index >= 0) {
          return {
            type: TextObjectType.OnsiteRedirect,
            text: part.split(/">([^]*?)<\/span>/g)[1],
            ...objOnsiteRedirects[index]
          }
        }
        return { type: TextObjectType.Text, text: part }
      }
    }).filter(item => !!item)
  }
}
