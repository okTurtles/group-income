/* globals describe, it, after */

/*
To see how Nightmare does its server stuff see:

- https://github.com/segmentio/nightmare/blob/2453f7f/test/server.js#L86
- https://github.com/segmentio/nightmare/blob/2771166/test/index.js#L43-L46
*/

require('should')

var Nightmare = require('nightmare')
var url = require('url')

describe('Frontend', function () {
   // TODO: use a different environment variable for show
  var n = Nightmare({show: !process.env.TRAVIS})
  after(() => { n.end() })

  it('Should start the backend server if necessary', function () {
    return require('../backend/index.js')
  })

  describe('New user page', function () {
    it('Should create user George', async function () {
      var result = await n.goto(page('new-user'))
      result.code.should.equal(200)

      result = await n.wait('#response')
      .insert('input[name="name"]', 'George')
      .insert('input[name="email"]', 'george@lasvegas.com')
      .insert('input[name="password"]', '$$111$$')
      .click('form.new-user button.sign-in')
      .wait(() => document.querySelector('#response').innerText !== '')
      .evaluate(() => document.querySelector('#response').className)

      result.should.not.equal('error')
    })

    it('Should fail to create George again', async function () {
      var result = await n.click('form.new-user button.sign-in')
      .wait(() => document.querySelector('#response').innerText !== '')
      .evaluate(function () {
        var response = document.querySelector('#response')
        return {class: response.className, text: response.innerText}
      })

      result.class.should.equal('error')
      result.text.should.containEql('must be unique')
    })
  })

  describe('Some other page', function () {
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
