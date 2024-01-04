import Markdown from 'markdown-it'
// import MarkdownSlack from 'slack-markdown-it'

const md = Markdown()
// md.use(MarkdownSlack)

export function convertToMarkdown (str: string): any {
  let converted = md.render(str)

  // remove line-breaks at the start/end of the converted string.
  converted = converted.replace(/^\s+|\s+$/g, '')

  // if the original string doesn't have a line-break within it,
  // the converted outcome doesn't need to be wrapped with <p></p>
  if (!str.includes('\n')) {
    converted = converted.replace(/^<p>|<\/p>$/g, '')
  }

  console.log('$$$ converted outcome: ', converted)
  return converted
}
