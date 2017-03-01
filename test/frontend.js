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
  var n = Nightmare({ show: !process.env.SHOW_BROWSER, height: 900 })
  after(() => { n.end() })

  it('Should start the backend server if necessary', function () {
    return require('../backend/index.js')
  })
  let randInt = (min, max) => Math.floor(Math.random() * (max - min)) + min
  let username = `testuser${randInt(0, 10000000)}${randInt(10000000, 20000000)}`
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
      this.timeout(4000) // this one takes a while for some reason
      await n.goto(page('event-log'))
        .should.finally.containEql({ code: 200, url: page('event-log') })
      let result = await n.wait('#random').evaluate(() => ({
        current: document.getElementById('LogPosition').innerText,
        eventCount: document.querySelectorAll('.event').length
      }))
      await n.click('#random')
        .wait(() => +document.getElementById('count').innerText > 0)
      let obj = await n.insert('textarea[name="payload"]', 'This is a test payment event')
        .select('select[name="type"]', 'Payment')
        .click('#submit')
        .wait(() => +document.getElementById('count').innerText > 1)
        .evaluate(() => ({
          current: document.getElementById('LogPosition').innerText,
          eventCount: document.querySelectorAll('.event').length
        }))
      should(obj.eventCount).equal(result.eventCount + 2)
      should(obj.current !== result.current).equal(true)
    })

    it('Should Traverse Log', async function () {
      this.timeout(4000)
      await n.goto(page('event-log'))
      let prior = await n.evaluate(() => document.getElementById('LogPosition').innerText)
      let initial = await n.wait('textarea[name="payload"]')
        .insert('textarea[name="payload"]', 'This is a test Group Payment Event')
        .select('select[name="type"]', 'Payment')
        .click('button.submit')
        .wait(prior => document.getElementById('LogPosition').innerText !== prior, prior)
        .evaluate(() => document.getElementById('LogPosition').innerText)
      let secondary = await n.click('a.backward')
        .wait(initial => document.getElementById('LogPosition').innerText !== initial, initial)
        .evaluate(() => document.getElementById('LogPosition').innerText)
      should(initial !== secondary).equal(true)
      let tertiary = await n.click('a.forward')
        .wait(secondary => document.getElementById('LogPosition').innerText !== secondary, secondary)
        .evaluate(() => document.getElementById('LogPosition').innerText)
      should(initial).equal(tertiary)
    })
  })

  describe('Sign up Test', function () {
    it('Should register User', async function () {
      this.timeout(4000)
      await n.goto(page('signup'))
      let signedup = await n.insert('#name', username)
        .insert('#email', `test@testgroupincome.com`)
        .insert('#password', 'testtest')
        .click('button[type="submit"]')
        .wait(() => !!document.getElementById('serverMsg').innerText)
        .evaluate(() => document.getElementById('serverMsg').innerText)
      should(signedup).equal('success')
      /*
      await n.insert('#name')
        .insert('#email')
        .insert('#password')
        .wait(() => !document.getElementById('name').innerText &&
        !document.getElementById('email').innerText &&
        !document.getElementById('password').innerText)
        */
    })
    it('Test Logout and Login', async function () {
      this.timeout(4000)
      let response = await n.click('#LoginBtn')
        .wait(() => document.getElementById('LoginBtn').classList.contains('is-primary'))
        .click('#LoginBtn')
        .wait(() => document.getElementById('LoginModal').classList.contains('is-active'))
        .insert('#LoginName', username)
        .insert('#LoginPassword', 'testtest')
        .click('#LoginButton')
        .wait(() => !!document.getElementById('LoginResponse'))
        .evaluate(() => document.getElementById('LoginResponse').innerText)
      should(response).not.equal('Invalid username or password')
    })
    /* There appears to be a bug in nightmare that causes the insert and type commands to enter old data into the field if the
    insert or type commands or used more than once on the same field. This concatenates the old values to the new.
     This occurs regardless of whether you clear the field or not. Until its fixed skip this validation test
     */
    it.skip('Test Validation', async function () {
      this.timeout(4000)
      await n.goto(page('signup'))
      let badUsername = 't e s t'
      let badEmail = `@fail`
      let badPassword = `789`// six is so afraid
      let denied = await n.insert('#name', badUsername)
        .insert('#email', badEmail)
        .insert('#password', badPassword)
        .evaluate(() => document.querySelector('button[type="submit"]').disabled)
      should(denied).equal(true)
      let usernameMsg = await n.evaluate(() => !!document.getElementById('badUsername'))
      should(usernameMsg).equal(true)
      let emailMsg = await n.evaluate(() => !!document.getElementById('badEmail'))
      should(emailMsg).equal(true)
      let passwordMsg = await n.evaluate(() => !!document.getElementById('badPassword'))
      should(passwordMsg).equal(true)
    })
  })

  describe('Group Creation Test', function () {
    it('Should create a group', async function () {
      this.timeout(4000)
      await n.click('#CreateGroup')
      let created = await n.insert('input[name="groupName"]', 'Test Group')
        .insert('textarea[name="sharedValues"]', 'Testing this software')
        .insert('input[name="groupName"]', 'Test Group')
        .insert('input[name="incomeProvided"]', '200')
        .insert('input[name="proxyChangePercentage"]', '75')
        .insert('input[name="proxyMemberApprovalPercentage"]', '75')
        .insert('input[name="proxyMemberRemovalPercentage"]', '75')
        .select('select[name="contributionPrivacy"]', 'Very Private')
        .click('button[type="submit"]')
        .wait(() => !!document.getElementById('successMsg'))
        .evaluate(() => !!document.getElementById('successMsg'))
      should(created).equal(true)
    })
    it('Should invite memebers to group', async function () {
      this.timeout(4000)
      await n.click('#nextButton')
        .wait(() => !!document.getElementById('addButton'))
      let count = await n.insert('#searchUser', username)
        .click('#addButton')
        .wait(() => document.querySelectorAll('.member').length > 0)
        .click('.delete')
        .wait(() => document.querySelectorAll('.member').length < 1)
        .evaluate(() => +document.querySelectorAll('.member').length)
      should(count).equal(0)
      let created = await n.insert('#searchUser', username)
        .click('#addButton')
        .wait(() => document.querySelectorAll('.member').length > 0)
        .click('button[type="submit"]')
        .wait(() => !!document.getElementById('successMsg'))
        .evaluate(() => !!document.getElementById('successMsg'))
      should(created).equal(true)
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
