/* eslint-env mocha */
/* globals $ */
/* eslint-disable no-spaced-func, no-unexpected-multiline */

/*
To see how Nightmare does its server stuff see:

- https://github.com/segmentio/nightmare/blob/2453f7f/test/server.js#L86
- https://github.com/segmentio/nightmare/blob/2771166/test/index.js#L43-L46
*/

global.Promise = require('bluebird')
require('should')

var Nightmare = require('nightmare')
var url = require('url')

describe.only('Frontend', function () {
  var n = Nightmare({show: !!process.env.SHOW_BROWSER, height: 900})
  after(() => { n.end() })

  it('Should start the backend server if necessary', function () {
    return require('../backend/index.js')
  })

  describe('New user page', function () {
    it('Should create user George', async function () {
      // this semi-colon at the end of of this.timeout is *required*.
      // For details, see: https://phabricator.babeljs.io/T7372#78495
      this.timeout(12000);
      (await n.goto(page('new-user')))
      .should.containEql({code: 200, url: page('new-user')})
      // for some reason we have to access `this`
      // only *after* we call `await` once.
      console.log(`<--${new Date().toTimeString()}-->`)
      console.log('typeof this:', typeof this, Object.keys(this))
      await n.wait(2000)
      console.log(`</-${new Date().toTimeString()}-->`)
      return n.wait('#response')
      .insert('input[name="name"]', 'George')
      .insert('input[name="email"]', 'george@lasvegas.com')
      .insert('input[name="password"]', '$$111$$')
      .click('form.new-user button.sign-in')
      .wait(() => document.querySelector('#response').innerText !== '')
      .evaluate(() => document.querySelector('#response').className)
      .should.finally.not.equal('error')
    })

    it('Should fail to create George again', function () {
      return n.click('form.new-user button.sign-in')
      .wait(() => document.querySelector('#response').innerText !== '')
      .evaluate(function () {
        var response = document.querySelector('#response')
        return {name: response.className, text: response.innerText}
      })
      .should.finally.containEql({name: 'error', text: 'email must be unique'})
    })
  })

  describe('EJS test page', function () {
    it('TODO list should have at least two items', function () {
      return n.click('#testEJS').wait('#todo')
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
