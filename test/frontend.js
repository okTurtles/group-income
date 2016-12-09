/* eslint-env mocha */
// globals $
/*
 To see how Nightmare does its server stuff see:

 - https://github.com/segmentio/nightmare/blob/2453f7f/test/server.js#L86
 - https://github.com/segmentio/nightmare/blob/2771166/test/index.js#L43-L46
 */

var should = require('should')

var Nightmare = require('nightmare')
var url = require('url')
var exec = require('child_process').execFile
var fs = require('fs')

describe('Frontend', function () {
  var n = Nightmare({ show: !!process.env.SHOW_BROWSER, height: 900 })
  after(() => { n.end() })

  it('Should start the backend server if necessary', function () {
    return require('../backend/index.js')
  })

  describe('New user page', function () {
    it('Should create user George', function () {
      this.timeout(5000)
      return n.goto(page('signup'))
        .should.finally.containEql({ code: 200, url: page('signup') })
        .then(() => {
          return n.wait('.signup')
            .insert('input[name="name"]', 'George')
            .insert('input[name="email"]', 'george@lasvegas.com')
            .insert('input[name="password"]', '$$111$$')
            .click('.signup button.submit')
            .wait(() => document.getElementById('serverMsg').innerText !== '')
            .evaluate(() => document.getElementById('serverMsg').className)
            .should.finally.containEql('success')
        })
    })

    it('Should fail to create George again', function () {
      return n.click('.signup button.submit')
        .wait(() => document.getElementById('serverMsg').className.indexOf('danger') !== -1)
    })
  })
  describe('Test Localization Gathering Function', function () {
    it('Verify output of transform functions', function (done) {
      let script = `
        <template>
            <i18n comment = "Amazing Test">A test of sorts</i18n>
            <i18n comment="Amazing Test2">A test of wit</i18n>
            <i18n>A test of strength</i18n>
        </template>
        <script>
            L('this is some translatable Text','this is relevant commentary')
            L('this text lacks a comment')
        </script>
        
         `
      let path = 'script.vue'
      fs.writeFile(path, script, (err) => {
        if (err) {
          throw err
        }
        let output = 'translation.json'
        let args = ['scripts/i18n.js', path, output]
        exec('node', args, (err, stdout, stderr) => {
          if (err) {
            throw err
          }
          fs.readFile(output, (err, json) => {
            if (err) {
              throw err
            }
            let localeObject = JSON.parse(json)
            should(localeObject).have.property('A test of sorts')
            should(localeObject).have.property('A test of wit')
            should(localeObject).have.property('A test of strength')
            should(localeObject).have.property('this is some translatable Text')
            should(localeObject).have.property('this text lacks a comment')
            should(localeObject['A test of sorts']).have.property('comment', 'Amazing Test')
            should(localeObject['A test of wit']).have.property('comment', 'Amazing Test2')
            should(localeObject['this is some translatable Text']).have.property('comment', 'this is relevant commentary')
            should(localeObject['this is some translatable Text']).have.property('text', 'this is some translatable Text')
            should(localeObject['this text lacks a comment']).have.property('text', 'this text lacks a comment')
            should(localeObject['A test of sorts']).have.property('text', 'A test of sorts')
            should(localeObject['A test of wit']).have.property('text', 'A test of wit')
            should(localeObject['A test of strength']).have.property('text', 'A test of strength')
            fs.unlink(path, (err) => {
              if (err) {
                throw err
              }
              fs.unlink(output, (err) => {
                if (err) {
                  throw err
                }
                done()
              })
            })
          })
        })
      })
    })
  })
  /*
   describe('EJS test page', function () {
   it('TODO list should have at least two items', function () {
   // return n.click('nav.nav .nav-center > .nav-item:last-child')
   return n.click('#testEJS')
   .wait(() => typeof $ !== 'undefined')
   .evaluate(() => $('#todo').children().length)
   .should.finally.greaterThan(1)
   })
   })
   */
})

function page (page) {
  return url.resolve(process.env.FRONTEND_URL, `simple/${page}`)
}

// returns the size of the document
Nightmare.action('size', function (done) {
  this.evaluate_now(function () {
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
    return {
      height: h,
      width: w
    }
  }, done)
})
