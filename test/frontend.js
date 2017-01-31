/* eslint-env mocha */
/* globals $ */
/*
 To see how Nightmare does its server stuff see:

 - https://github.com/segmentio/nightmare/blob/2453f7f/test/server.js#L86
 - https://github.com/segmentio/nightmare/blob/2771166/test/index.js#L43-L46
 */

const should = require('should')

const Nightmare = require('nightmare')
const url = require('url')
const exec = require('child_process').execFileSync
const fs = require('fs')

describe('Frontend', function () {
  var n = Nightmare({ show: !!process.env.SHOW_BROWSER, height: 900 })
  after(() => { n.end() })

  it('Should start the backend server if necessary', function () {
    return require('../backend/index.js')
  })

  describe.skip('New user page', function () {
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
  describe('Event Log Test', function () {
    it('Should Append to the log', async function () {
      this.timeout(10000)
      await n.goto(page('event-log'))
        .should.finally.containEql({ code: 200, url: page('event-log') })
      let result = await n.wait('#random')
        .evaluate((current, eventCount) => {
          return { current: document.getElementById('LogPosition').innerText, eventCount: document.querySelectorAll('.event').length }
        })
      await n.click('#random').wait(() => Number(document.getElementById('count').innerText) > 0)

      let obj = await n.insert('textarea[name="payload"]', 'This is a test payment event')
        .select('select[name="type"]', 'payment')
        .click('#submit')
        .wait(() => Number(document.getElementById('count').innerText) > 1)
        .evaluate(() => {
          return { current: document.getElementById('LogPosition').innerText, eventCount: document.querySelectorAll('.event').length }
        })
      should(obj.eventCount).equal(result.eventCount + 2)
      should(obj.current !== result.current).equal(true)
    })
    it('Should Traverse Log', async function () {
      this.timeout(10000)
      await n.goto(page('event-log'))
      let initial = await n.wait('textarea[name="payload"]')
        .insert('textarea[name="payload"]', 'This is a test Group Payment Event')
        .select('select[name="type"]', 'payment')
        .click('button.submit')
        .wait(() => {
          return document.getElementById('LogPosition').innerText !== ''
        })
        .evaluate(() => {
          return document.getElementById('LogPosition').innerText
        })
      let secondary = await n.click('a.backward')
        .wait((initial) => {
          return document.getElementById('LogPosition').innerText !== initial
        }, initial)
        .evaluate(() => {
          return document.getElementById('LogPosition').innerText
        })
      should(initial !== secondary).equal(true)
      let tertiary = await n.click('a.forward')
        .wait((secondary) => {
          return document.getElementById('LogPosition').innerText !== secondary
        }, secondary)
        .evaluate(() => {
          return document.getElementById('LogPosition').innerText
        })
      should(initial).equal(tertiary)
    })
  })

  describe('Test Localization Gathering Function', function () {
    it('Verify output of transform functions', function () {
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
      fs.writeFileSync(path, script)
      let output = 'translation.json'
      let args = ['scripts/i18n.js', path, output]
      exec('node', args)
      let json = fs.readFileSync(output, 'utf8')
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
      fs.unlinkSync(path)
      fs.unlinkSync(output)
    })
  })

  describe('EJS test page', function () {
    it('List should have at least two items', function () {
      return n.goto(page('ejs-page'))
        .wait(() => typeof $ === 'function' && !!$().prevUntil)
        .evaluate(() => $('#todo').children().length)
        .should.finally.greaterThan(1)
    })
  })
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
