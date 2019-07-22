const cheerio = require('cheerio')
const ejs = require('ejs')
const fs = require('fs')
const pth = require('path')

const localeObject = {}
function parseJS (text) {
  const functionEx = /\bL\(\s*['"](.*?)['"]\s*(?:,\s*['"](.*?)['"]\s*)?\)/mg
  let matches = functionEx.exec(text)
  while (matches) {
    const text = matches[1]
    const comment = matches[2]
    localeObject[text] = { text: text, comment: comment || '' }
    matches = functionEx.exec(text)
  }
}
function parseHtml (text) {
  const $ = cheerio.load(text)
  $('i18n').each((index, el) => {
    const text = $(el).text()
    localeObject[text] = { text: text, comment: $(el).attr('comment') || '' }
  })
  $('script').each((index, el) => {
    parseJS($(el).text())
  })
}
function traversePath (path, cb) {
  fs.stat(path, (err, stats) => {
    if (err) {
      return cb(err)
    }
    if (stats.isFile()) {
      if (/\.(vue|html)$/.test(path)) {
        fs.readFile(path, (err, data) => {
          if (err) {
            return cb(err)
          }
          const text = data.toString()
          parseHtml(text)
          return cb()
        })
      } else if (/\.(js)$/.test(path)) {
        fs.readFile(path, (err, data) => {
          if (err) {
            return cb(err)
          }
          const text = data.toString()
          parseJS(text)
          return cb()
        })
      } else if (/\.(ejs)$/.test(path)) {
        ejs.renderFile(path, {}, {}, (err, text) => {
          if (err) {
            return cb(err)
          }
          parseHtml(text)
          return cb()
        })
      } else {
        return cb()
      }
    } else if (stats.isDirectory()) {
      fs.readdir(path, function (err, items) {
        if (err) {
          return cb(err)
        }
        const contents = items.map(function (item) {
          return pth.join(path, item)
        })
        let i = -1
        let current
        const next = (err) => {
          if (err) {
            return cb(err)
          }
          i++
          if (i < contents.length) {
            current = contents[i]
            traversePath(current, next)
          } else {
            return cb()
          }
        }
        next()
      })
    }
  })
}

const source = process.argv[2] || '../frontend/'
const output = process.argv[3] || '../frontend/assets/locales/en/translation.json'
traversePath(source, (err) => {
  if (err) {
    throw err
  }
  fs.writeFileSync(output, JSON.stringify(localeObject))
})
