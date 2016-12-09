const cheerio = require('cheerio')
const ejs = require('ejs')
const fs = require('fs')
const pth = require('path')

let localeObject = {}
function parseJS (text) {
  let functionEx = /\bL\(\s*['"](.*?)['"]\s*(?:,\s*['"](.*?)['"]\s*)?\)/mg
  let matches
  while ((matches = functionEx.exec(text)) !== null) {
    let text = matches[ 1 ]
    let comment = matches[ 2 ]
    localeObject[ text ] = { text: text, comment: comment || '' }
  }
}
function parseHtml (text) {
  let $ = cheerio.load(text)
  $('i18n').each((index, el) => {
    let text = $(el).text()
    localeObject[ text ] = { text: text, comment: $(el).attr('comment') || '' }
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
          let text = data.toString()
          parseHtml(text)
          return cb()
        })
      } else if (/\.(js)$/.test(path)) {
        fs.readFile(path, (err, data) => {
          if (err) {
            return cb(err)
          }
          let text = data.toString()
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
        let contents = items.map(function (item) {
          return pth.join(path, item)
        })
        let i = -1
        let current
        let next = (err) => {
          if (err) {
            return cb(err)
          }
          i++
          if (i < contents.length) {
            current = contents[ i ]
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

const source = process.argv[ 2 ] || '../frontend/simple/'
const output = process.argv[ 3 ] || '../frontend/simple/locales/en/translation.json'
traversePath(source, (err) => {
  if (err) {
    throw err
  }
  fs.writeFileSync(output, JSON.stringify(localeObject))
})
