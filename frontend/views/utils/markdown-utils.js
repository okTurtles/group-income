import sbp from '@sbp/sbp'
import { marked } from 'marked'
import { validateURL } from '@view-utils/misc.js'
import { TextObjectType } from '@utils/constants.js'

export const makeOnsiteRedirectElement = (data?: Object): {
  prefix: string, suffix: string
} => {
  return {
    prefix: `<router route='${JSON.stringify(data ?? {})}'>`,
    suffix: '</router>'
  }
}

export type MarkdownSegment = {
  type: 'code' | 'plain',
  text: string
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
  // STEP 1. Handle multiple line-breaks
  // markedjs with the gfm(Github Flavored Markdown) style always collapses multiple line-breaks into one
  // so we need some custom logic to handle it manually.
  // (Reference issue here: https://github.com/markedjs/marked/issues/190)
  str = str.replace(/\n(?=\n)/g, '\n<br>')
    .replace(/<br>\n(\s*)(\d+\.|-|```)/g, '\n\n$1$2') // custom-handling the case where <br> is directly followed by the start of block-code (```)
    .replace(/(\d+\.|-)(\s.+)\n<br>/g, '$1$2\n\n') // this is a custom-logic added so that the end of ordered/un-ordered lists are correctly detected by markedjs.

  // STEP 2. convert the markdown into html DOM string.
  let converted = marked.parse(str, { gfm: true })

  // STEP 3. Remove the unecessary starting/end line-breaks added in/outside of the converted html tags.
  converted = converted.replace(/<([a-z]+)>\n/g, '<$1>')
    .replace(/\n<\/([a-z]+)>/g, '</$1>')

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
  const onsiteRedirectElements = textInSafeHTML.match(/<router route='([^]*?)<\/router>/g)

  if (!onsiteRedirectElements) {
    return [{ type: TextObjectType.Text, text: textInSafeHTML }]
  } else {
    const objOnsiteRedirects = onsiteRedirectElements.map(ele => ({ ...JSON.parse(ele.split(/route='([^]*?)'>/g)[1]), raw: ele }))
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
            text: part.split(/'>([^]*?)<\/router>/g)[1],
            ...objOnsiteRedirects[index]
          }
        }
        return { type: TextObjectType.Text, text: part }
      }
    }).filter(item => !!item)
  }
}

export function splitStringByMarkdownCode (
  str: string
): Array<MarkdownSegment> {
  // This function takes a markdown string and split it by texts written as either inline/block code.
  // (e.g. `asdf`, ```const var = 123```)

  const regExCodeMultiple = /(^```\n[\s\S]*?```$)/gm // Detecting multi-line code-block by reg-exp - reference: https://regexr.com/4h9sh
  const regExCodeInline = /(`.+`)/g
  const splitByMulitpleCode = str.split(regExCodeMultiple)
  const finalArr = []

  for (const segment of splitByMulitpleCode) {
    if (regExCodeMultiple.test(segment)) {
      finalArr.push({ type: 'code', text: segment })
    } else {
      const splitByInlineCode = segment.split(regExCodeInline)
        .map(piece => {
          return regExCodeInline.test(piece)
            ? { type: 'code', text: piece }
            : { type: 'plain', text: piece }
        })

      finalArr.push(...splitByInlineCode)
    }
  }
  return finalArr
}

export function combineMarkdownSegmentListIntoString (
  segmentList: Array<MarkdownSegment>
): string {
  // This is pretty much reverting what splitStringByMarkdownCode() above does.
  // It combines the object list into a string.
  return segmentList.reduce(
    (concatenated: string, entry: MarkdownSegment) => concatenated + entry.text,
    ''
  )
}
