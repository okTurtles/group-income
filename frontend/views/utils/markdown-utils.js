import { marked } from 'marked'
import { validateURL } from './misc.js'
import { swapMentionIDForDisplayname } from '@model/chatroom/utils.js'

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
        const { isValid, isExternalLink } = validateURL(token.href, true)

        if (isValid) {
          const { href, text } = token
          return `<a class="link" href="${href}" ${isExternalLink ? 'target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`
        }
        return token.raw
      }
    }
  ],
  renderer: {
    // reference: https://marked.js.org/using_pro#renderer
    table (header, body) {
      // If table has long content, we need to be able to scroll horizontally.
      // But <table> element itself doesn't support horizontal scrolling, so it needs to be wrapped in a <div> as a scrollable container.
      return `<div class="table-container"><table class="table"><thead>${header}</thead><tbody>${body}</tbody></table></div>`
    }
  }
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

      // GI needs to keep the line-breaks in the markdown but the markedjs with 'gfm' option doesn't fully support it.
      // So we need to manually add <br/> tags here before passing it to markedjs.
      // (Reference: https://github.com/markedjs/marked/issues/190#issuecomment-865303317)
      entryText = entryText.replace(/\n(?=\n)/g, '\n\n<br/>\n')
      entry.text = entryText
    }
  })

  str = combineMarkdownSegmentListIntoString(strSplitByCodeMarkdown)

  // STEP 2. convert the markdown into html DOM string.
  let converted = marked.parse(str, { gfm: true })

  // STEP 3. Remove the unecessary starting/end line-breaks added in/outside of the converted html tags.
  converted = converted.replace(/<([a-z]+)>\n/g, '<$1>')
    .replace(/\n<\/([a-z]+)>/g, '</$1>')

  // STEP 4. Sanitize some <br/>s that directly precedes/follows <ul>, <ol>, <blockquote> elements.
  //         - These are block elements by themselves, meaning they naturally carry one line-breaks at the start/end the tag(s).
  //           So remove 1 direct sibling <br>s. (reference issue: https://github.com/okTurtles/group-income/issues/2529)
  converted = converted.replace(/<br\/>\s*?(<ul>|<ol>|<blockquote>)/g, '$1')
    .replace(/(<\/ul>|<\/ol>|<\/blockquote>)\s*?<br\/>/g, '$1')
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

  const regExCodeMultiple = /(```[a-z]*?\n[\s\S]*?```$)/gm // Detecting multi-line code-block by reg-exp - reference: https://regexr.com/4h9sh
  const regExCodeInline = /(`[^`]+`)/g
  const splitByMulitpleCode = str.split(regExCodeMultiple)
  const finalArr = []

  for (const segment of splitByMulitpleCode) {
    if (regExCodeMultiple.test(segment)) {
      finalArr.push({ type: 'code', text: segment })
    } else {
      const splitByInlineCode = segment.split(regExCodeInline) // Check for inline codes and mark them as type: 'code'
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

export function stripMarkdownSyntax (markdownString: string, truncateTo: number = -1): string {
  markdownString = swapMentionIDForDisplayname(markdownString) // eg. '@identityContractID' -> '@user1'

  const sanitized = markdownString
    .replace(/\*\*(.*?)\*\*/g, '$1') // 'bold'
    .replace(/_(.*?)_/g, '$1') // 'italic'
    .replace(/~(.*?)~/g, '$1') // 'strike-through'
    .replace(/```/g, '') // 'code block'
    .replace(/`(.*?)`/g, '$1') // 'inline code'
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // links ([text](url) -> text)
    .replace(/^>\s*/gm, '') // block-quote
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()

  return truncateTo > 0 ? sanitized.slice(0, truncateTo) : sanitized
}
