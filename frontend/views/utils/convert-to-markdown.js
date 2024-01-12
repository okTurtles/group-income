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

  console.log('$$$ converted outcome: ', converted)
  return converted
}
