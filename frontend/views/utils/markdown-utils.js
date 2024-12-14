import { marked } from 'marked'
import { validateURL } from './misc.js'

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
        const { isValid } = validateURL(token.href)
        if (isValid) {
          const { href, text } = token
          // custom renderer for <a> tag for setting target='_blank' to the output HTML
          return `<a class="link" href="${href}" target="_blank">${text}</a>`
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

  // There is some caveats discovered with 'dompurify' and DOMParser() API regarding how they interpret '<' and '>' characters.
  // So manually converting them to '&lt;' and '&gt;' here first.
  // ( context: https://github.com/okTurtles/group-income/issues/2130 )
  const strSplitByCodeMarkdown = splitStringByMarkdownCode(str)
  strSplitByCodeMarkdown.forEach((entry, index) => {
    if (entry.type === 'plain' && strSplitByCodeMarkdown[index - 1]?.text !== '```') {
      let entryText = entry.text
      entryText = entryText.replace(/</g, '&lt;')
        .replace(/(?<!(^|\n))>/g, '&gt;') // Replace all '>' with '&gt;' except for the ones that are not preceded by a line-break or start of the string (e.g. '> asdf' is a blockquote).

      entryText = entryText.replace(/\n(?=\n)/g, '\n<br>')
        .replace(/<br>\n(\s*)(>|\d+\.|-)/g, '\n\n$1$2') // [1] custom-handling the case where <br> is directly followed by the start of ordered/unordered lists
        .replace(/(>|\d+\.|-)(\s.+)\n<br>/g, '$1$2\n\n') // [2] this is a custom-logic added so that the end of ordered/un-ordered lists are correctly detected by markedjs.
        .replace(/(>)(\s.+)\n<br>/gs, '$1$2\n\n') // [3] this is a custom-logic added so that the end of blockquotes are correctly detected by markedjs. ('s' flag is needed to account for multi-line strings)

      entry.text = entryText
    }
  })

  str = combineMarkdownSegmentListIntoString(strSplitByCodeMarkdown)
  str = str.replace(/(\d+\.|-)(\s.+)\n<br>/g, '$1$2\n\n')
    .replace(/(>)(\s.+)\n<br>/gs, '$1$2\n\n')  // Check for [2], [3] above once more to resolve edge-cases (reference: https://github.com/okTurtles/group-income/issues/2356)

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

export function splitStringByMarkdownCode (
  str: string
): Array<MarkdownSegment> {
  // This function takes a markdown string and split it by texts written as either inline/block code.
  // (e.g. `asdf`, ```const var = 123```)

  const regExCodeMultiple = /(^[\s]*```\n[\s\S]*?```$)/gm // Detecting multi-line code-block by reg-exp - reference: https://regexr.com/4h9sh
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
