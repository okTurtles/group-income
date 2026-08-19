import { marked } from 'marked'
import { validateURL } from './misc.js'
import { splitStringByMarkdownCode, combineMarkdownSegmentListIntoString } from '@utils/markdown-parsers.js'

const HREF_ESCAPE_MAP = { '"': '%22', "'": '%27', '<': '%3C', '>': '%3E', '`': '%60' }

// The href below is interpolated into a double-quoted HTML attribute, and the resulting string is
// re-parsed by DOMParser in chat-mentions-utils.js, which hands every attribute it finds straight to
// Vue. Percent-encode the characters that could otherwise close the attribute and inject a new one.
// (eg. [x](/a"onclick="alert(1)) )
function escapeHref (href: any): string {
  return String(href).replace(/["'<>`]/g, char => HREF_ESCAPE_MAP[char])
}

marked.use({
  extensions: [
    {
      name: 'link',
      level: 'inline',
      renderer (token) {
        const { isValid, isExternalLink, url } = validateURL(token.href, true)

        if (isValid) {
          const { href, text } = token
          // For non-external links, validateURL() could perform some transformations to the path and
          // in that case, that is returned as 'url' property.
          const urlToUse = escapeHref(isExternalLink ? href : url)
          // marked with 'gfm' option doesn't perform markdown syntax conversion when they are inside link,
          // So we need to perform another conversion step here.
          const parsedText = marked.parseInline(text, { gfm: true })
          return `<a class="link" href="${urlToUse}" ${isExternalLink ? 'target="_blank" rel="noopener noreferrer"' : ''}>${parsedText}</a>`
        }
        return token.raw
      }
    },
    {
      name: 'image',
      level: 'inline',
      // The chat has its own image upload feature, and an <img> here would load a remote url on render,
      // leaking every reader's IP to whoever sent the message. So do not render it at all for now unless we plan to allow it.
      renderer: (token) => token.raw
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
  converted = converted.replace(/<br\/>\s*?(<ul>|<ol>|<blockquote>|<hr>)/g, '$1')
    .replace(/(<\/ul>|<\/ol>|<\/blockquote>|<hr>)\s*?<br\/>/g, '$1')
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

export {
  splitStringByMarkdownCode,
  combineMarkdownSegmentListIntoString
}
