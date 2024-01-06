// !!! TODO: REMOVE THIS FILE AFTER DEVELOPEMENT !!!

const marked = require('marked')
marked.use({
  extensions: [{
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
  }]
})

const md = `
qwerweqr \`dasfsafd\` adssadf *qqq* woow _another_ asdfafsd
asdfsdaf
# adsfsdf
`
const tokens = marked.lexer(md)
const parsedHTML = marked.parser(tokens)
console.log('Generated tokens: ', JSON.stringify(tokens))
console.log('\r\n\r\n Generated HTML: \r\n', parsedHTML)
