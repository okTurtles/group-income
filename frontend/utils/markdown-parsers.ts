// Dependency-free markdown string parsers, kept out of '@view-utils/markdown-utils.js' on purpose.
// markdown-utils.js pulls in 'marked' (and 'vue-router' via misc.js), but these two functions are also
// used by '@model/chatroom/utils.js', which is part of the service-worker bundle graph. Keeping them
// here in a neutral layer avoids dragging those view-only dependencies into the service worker.

export type MarkdownSegment = {
  type: 'code' | 'plain',
  text: string
}

export function combineMarkdownSegmentListIntoString (
  segmentList: Array<MarkdownSegment>
): string {
  // This is pretty much reverting what splitStringByMarkdownCode() below does.
  // It combines the object list into a string.
  return segmentList.reduce(
    (concatenated: string, entry: MarkdownSegment) => concatenated + entry.text,
    ''
  )
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

  // Capture the case where the last entry is a plain text that contains a multi-line code symbols in the middle but doesn't have the closing pair.
  // In this case, everything after the starting code-fence symbols should be treated as a code block.
  const lastEntry = finalArr[finalArr.length - 1]
  if (lastEntry.type === 'plain' && /(?:^|\n)```[a-z]*\n/.test(lastEntry.text)) {
    const originalText = lastEntry.text
    const multiLineCodeIndex = originalText.search(/(?:^|\n)```[a-z]*\n/)
    lastEntry.text = originalText.slice(0, multiLineCodeIndex)
    finalArr.push({ type: 'code', text: originalText.slice(multiLineCodeIndex).trimEnd() })
  }

  return finalArr
}
