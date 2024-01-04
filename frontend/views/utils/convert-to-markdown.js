import Markdown from 'markdown-it'
import MarkdownSlack from 'slack-markdown-it'

const md = Markdown()
md.use(MarkdownSlack)

export function convertToMarkdown (str: string): any {
  let result
  if (str.includes('\n')) {
    result = md.render(str)
  } else {
    result = md.renderInline(str)
  }

  console.log('$$$ converted result: ', result)
  return result
}
