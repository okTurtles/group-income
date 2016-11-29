/* eslint-env mocha */
/* globals $ */

/*
To see how Nightmare does its server stuff see:

- https://github.com/segmentio/nightmare/blob/2453f7f/test/server.js#L86
- https://github.com/segmentio/nightmare/blob/2771166/test/index.js#L43-L46
*/

require('should')

var Nightmare = require('nightmare')
var url = require('url')

describe('Frontend', function () {
  var n = Nightmare({show: !!process.env.SHOW_BROWSER, height: 900})
  after(() => { n.end() })

  it('Should start the backend server if necessary', function () {
    return require('../backend/index.js')
  })

  describe('New user page', function () {
    it('Should create user George', function () {
      this.timeout(5000)
      return n.goto(page('signup'))
      .should.finally.containEql({code: 200, url: page('signup')})
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

  describe('EJS test page', function () {
    it('TODO list should have at least two items', function () {
      // return n.click('nav.nav .nav-center > .nav-item:last-child')
      return n.click('#testEJS')
      .wait(() => typeof $ !== 'undefined')
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
