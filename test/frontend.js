/* eslint-env mocha */
/* globals $ */
/*
 To see how Nightmare does its server stuff see:

 - https://github.com/segmentio/nightmare/blob/2453f7f/test/server.js#L86
 - https://github.com/segmentio/nightmare/blob/2771166/test/index.js#L43-L46
 */

const chalk = require('chalk')
const should = require('should')

const Nightmare = require('nightmare')
const url = require('url')
const exec = require('child_process').execFileSync
const fs = require('fs')

describe('Frontend', function () {
  const n = Nightmare({
    // openDevTools: true,
    show: !!process.env.SHOW_BROWSER,
    height: 900
  })
  n.on('page', (type, msg, stack) => {
    if (type === 'error') {
      console.log(chalk`{bold {red [NIGHTMARE]} {blue msg: ${msg}}}`, stack)
    }
  })
  n.on('console', (type, args) => {
    if (type === 'error') {
      console.log(chalk`{bold {red [NIGHTMARE]} {blue console:}}`, args)
    }
  })

  after(() => { n.end() })

  it('Should start the backend server if necessary', function () {
    return require('../backend/index.js')
  })
  let username = `User`

  describe.skip('New user page', function () {
    it('Should create user George', function () {
      this.timeout(5000)
      return n.goto(page('signup'))
        .should.finally.containEql({ code: 200, url: page('signup') })
        .then(() => {
          return n
            .wait('.signup')
            .insert('input[name="name"]', 'George')
            .insert('input[name="email"]', 'george@lasvegas.com')
            .insert('input[name="password"]', '$$111$$')
            .wait(() => !document.querySelector('button[type="submit"]').disabled)
            .click('.signup button.submit')
            .wait(() => document.getElementById('serverMsg').innerText !== '')
            .evaluate(() => document.getElementById('serverMsg').className)
            .should.finally.containEql('success')
        })
    })

    it.skip('Should fail to create George again', function () {
      return n.click('.signup button.submit')
        .wait(() => document.getElementById('serverMsg').className.indexOf('danger') !== -1)
    })
  })

  // NOTE: we no longer do anything with the event log page
  describe.skip('Event Log Test', function () {
    it('Should Append to the log', async function () {
      this.timeout(5000) // this one takes a while for some reason
      await n
        .goto(page('event-log'))
        .should.finally.containEql({ code: 200, url: page('event-log') })
      const result = await n.wait('#random').evaluate(() => ({
        current: document.getElementById('LogPosition').innerText,
        eventCount: document.querySelectorAll('.event').length
      }))
      await n
        .click('#random')
        .wait(() => +document.getElementById('count').innerText > 0)
      const obj = await n
        .insert('textarea[name="payload"]', 'This is a test payment event')
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

    // TODO: restore this based on the new TimeTravel
    it('Should Traverse Log', async function () {
      this.timeout(4000)
      await n.goto(page('event-log'))
      const prior = await n.evaluate(() => document.getElementById('LogPosition').innerText)
      const initial = await n
        .wait('textarea[name="payload"]')
        .insert('textarea[name="payload"]', 'This is a test Group Payment Event')
        .select('select[name="type"]', 'Payment')
        .click('#submit')
        .wait(prior => document.getElementById('LogPosition').innerText !== prior, prior)
        .evaluate(() => document.getElementById('LogPosition').innerText)
      const secondary = await n.click('a.backward')
        .wait(initial => document.getElementById('LogPosition').innerText !== initial, initial)
        .evaluate(() => document.getElementById('LogPosition').innerText)
      should(initial !== secondary).equal(true)
      const tertiary = await n.click('a.forward')
        .wait(secondary => document.getElementById('LogPosition').innerText !== secondary, secondary)
        .evaluate(() => document.getElementById('LogPosition').innerText)
      should(initial).equal(tertiary)
    })
  })

  describe('Sign up Test', function () {
    it('Should register User', async function () {
      this.timeout(10000)
      await n.goto(page('signup')).wait('#name')
      const signedup = await n
        .insert('#name', username)
        .insert('#email', `test@testgroupincome.com`)
        .insert('#password', 'testtest')
        .wait(() => !document.querySelector('button[type="submit"]').disabled)
        .click('button[type="submit"]')
        .wait('#HomeLogo')
        .evaluate(() => !!document.getElementById('HomeLogo'))
      should(signedup).equal(true)
    })
    it('Test Profile Change', async function () {
      this.timeout(10000)
      let success = await n
        .click('#OpenProfileDropDown')
        .click('#ProfileLink')
        .wait('input[name="profilePicture"]')
        .insert('textarea[name="bio"]', 'Born in a test case')
        .insert('input[name="displayName"]', 'Tester T Test')
        .insert('textarea[name="bio"]', 'Born in a test case')
        .insert('input[name="profilePicture"]') // clear
        .insert('input[name="profilePicture"]', 'http://testing.rocks')
        .insert('input[name="profileEmail"]') // clear
        .insert('input[name="profileEmail"]', 'email@testing.rocks')
        .click('#SaveProfileButton')
        .wait('#ProfileSaveSuccess')
        .exists('#ProfileSaveSuccess')
      should(success).equal(true)
      // TODO Make more complex. Unfortunately bugs in Nightmare prevent the clearing and re-entering of fields
      // those Nightmare bugs seem to be gone now, so TODO it is
    })
    it('Test Logout and Login', async function () {
      this.timeout(10000)
      const loggedin = await n
        .click('#LogoutBtn')
        .wait('#LoginBtn')
        .click('#LoginBtn')
        .wait('#LoginModal.is-active')
        .insert('#LoginName', username)
        .insert('#LoginPassword', 'testtest')
        .click('#LoginButton')
        .wait('#LoginResponse')
        .wait('#OpenProfileDropDown')
        .click('#OpenProfileDropDown')
        .exists('#LogoutBtn')
      should(loggedin).equal(true)
    })

    /* There appears to be a bug in nightmare that causes the insert and type commands to enter old data into the field if the
    insert or type commands or used more than once on the same field. This concatenates the old values to the new.
     This occurs regardless of whether you clear the field or not. Until its fixed skip this validation test
     */
    it.skip('Test Validation', async function () {
      this.timeout(4000)
      await n.goto(page('signup'))
      const badUsername = 't e s t'
      const badEmail = `@fail`
      const badPassword = `789`// six is so afraid
      const denied = await n.insert('#name', badUsername)
        .insert('#email', badEmail)
        .insert('#password', badPassword)
        .evaluate(() => document.querySelector('button[type="submit"]') && document.querySelector('button[type="submit"]').disabled)
      should(denied).equal(true)
      const usernameMsg = await n.evaluate(() => !!document.getElementById('badUsername'))
      should(usernameMsg).equal(true)
      const emailMsg = await n.evaluate(() => !!document.getElementById('badEmail'))
      should(emailMsg).equal(true)
      const passwordMsg = await n.evaluate(() => !!document.getElementById('badPassword'))
      should(passwordMsg).equal(true)
    })
  })

  describe('Group Creation Test', function () {
    it('Create Additional User', async function () {
      this.timeout(8000)
      const signedup = await n
        .wait('#LogoutBtn')
        .click('#LogoutBtn')
        .wait('#SignupBtn')
        .click('#SignupBtn')
        .wait('#name')
        .insert('#name', username + '2')
        .insert('#email', 'test2@testgroupincome.com')
        .insert('#password', 'testtest')
        .wait(() => document.querySelector('button[type="submit"]') && !document.querySelector('button[type="submit"]').disabled)
        .click('button[type="submit"]')
        .wait('#HomeLogo')
        .exists('#HomeLogo')
      should(signedup).equal(true)
    })

    it('Create Additional User 3', async function () {
      this.timeout(8000)
      const signedup = await n
        .click('#OpenProfileDropDown')
        .wait('#LogoutBtn')
        .click('#LogoutBtn')
        .wait('#SignupBtn')
        .click('#SignupBtn')
        .wait('#name')
        .insert('#name', username + '3')
        .insert('#email', `test2@testgroupincome.com`)
        .insert('#password', 'testtest')
        .wait(() => document.querySelector('button[type="submit"]') && !document.querySelector('button[type="submit"]').disabled)
        .click('button[type="submit"]')
        .wait('#HomeLogo')
        .exists('#HomeLogo')
      should(signedup).equal(true)
    })

    it('Create Additional User 4', async function () {
      this.timeout(8000)
      const signedup = await n
        .click('#OpenProfileDropDown')
        .click('#LogoutBtn')
        .wait('#SignupBtn')
        .click('#SignupBtn')
        .wait('#name')
        .insert('#name', username + '4')
        .insert('#email', `test2@testgroupincome.com`)
        .insert('#password', 'testtest')
        .wait(() => document.querySelector('button[type="submit"]') && !document.querySelector('button[type="submit"]').disabled)
        .click('button[type="submit"]')
        .wait('#HomeLogo')
        .exists('#HomeLogo')
      should(signedup).equal(true)
    })

    it('Create Additional User 5', async function () {
      this.timeout(8000)
      const signedup = await n
        .click('#OpenProfileDropDown')
        .click('#LogoutBtn')
        .wait('#SignupBtn')
        .click('#SignupBtn')
        .wait('#name')
        .insert('#name', username + '5')
        .insert('#email', `test2@testgroupincome.com`)
        .insert('#password', 'testtest')
        .wait(() => document.querySelector('button[type="submit"]') && !document.querySelector('button[type="submit"]').disabled)
        .click('button[type="submit"]')
        .wait('#HomeLogo')
        .exists('#HomeLogo')
      should(signedup).equal(true)
    })

    it('Should create a group', async function () {
      const testName = 'Test Group'
      const testValues = 'Testing this software'
      const testIncome = 200
      const testSetting = 80
      this.timeout(10000)
      await n
        .click('#CreateGroup')
        // fill group data
        .wait('input[name="groupName"]')
        .insert('input[name="groupName"]', testName)
        .click('#nextBtn')
        .wait('textarea[name="sharedValues"]')
        .insert('textarea[name="sharedValues"]', testValues)
        .click('#nextBtn')
        .wait('input[name="incomeProvided"]')
        .insert('input[name="incomeProvided"]', testIncome)
        .click('#nextBtn')
        .wait('#rulesStep')
        // set rules step skipped for now
        .click('#nextBtn')
        .wait('#privacyStep')
        .click('#nextBtn')
        // invite members
        .wait('input[name="invitee"]')
        .insert('input[name="invitee"]', username + '4')
        .click('#addButton')
        .wait('.invitee')

      const invited = await n.evaluate(() => document.querySelectorAll('.invitee').length)
      should(invited).equal(1)

      await n
        .click('#nextBtn')
        .wait('#summaryStep')
      // summary page sees group as valid
      const valid = await n.exists('#finishBtn:not(:disabled)')
      should(valid).equal(true)
      // submit group
      await n
        .click('#finishBtn')
        .wait('#dashboard')

      const created = await n.evaluate(() => ({
        groupName: document.querySelector('#groupName').innerText,
        sharedValues: document.querySelector('#sharedValues').innerText,
        incomeProvided: document.querySelector('.min-income').innerText,
        changePercentage: document.querySelector('#changePercentage').innerText,
        memberApprovalPercentage: document.querySelector('#approvePercentage').innerText,
        memberRemovalPercentage: document.querySelector('#removePercentage').innerText
      }))
      should(created.groupName).equal(testName)
      should(created.sharedValues).equal(testValues)
      should(created.incomeProvided).equal('$' + testIncome)
      should(created.changePercentage).equal(testSetting + '%')
      should(created.memberApprovalPercentage).equal(testSetting + '%')
      should(created.memberRemovalPercentage).equal(testSetting + '%')
    })

    it('Should invite members to group', async function () {
      this.timeout(4000)

      const count = await n
        .click('.invite-button')
        .wait('#addButton')
        .insert('input[name="invitee"]', username)
        .click('#addButton')
        .wait(() => document.querySelectorAll('.invitee').length > 0)
        .wait('.delete')
        .click('.delete')
        .wait(() => document.querySelectorAll('.invitee').length < 1)
        .evaluate(() => +document.querySelectorAll('.invitee').length)
      should(count).equal(0)

      const created = await n
        .insert('input[name="invitee"]', username)
        .click('#addButton')
        .wait(() => document.querySelectorAll('.invitee').length > 0)
        .insert('input[name="invitee"]', username + '2')
        .click('#addButton')
        .wait(() => document.querySelectorAll('.invitee').length > 1)
        .click('button[type="submit"]')
        .wait(() => !!document.querySelector('.notification.is-success'))
        .evaluate(() => !!document.querySelector('.notification.is-success'))
      should(created).equal(true)
    })

    it('Should Receive Message and Invite', async function () {
      this.timeout(10000)
      await n
        .goto(page('mailbox'))
        .wait('#Inbox')
        .click('#ComposeLink')
        .wait('#AddRecipient')
        .insert('#AddRecipient', username)
        .insert('#ComposedMessage', 'Best test ever!!')
        .click('#SendButton')
        .wait('#Inbox')
        .click('#OpenProfileDropDown')
        .click('#LogoutBtn')
        .wait('#LoginBtn')
        .click('#LoginBtn')
        .wait('#LoginModal')
        .insert('#LoginName', username)
        .insert('#LoginPassword', 'testtest')
        .click('#LoginButton')
        .wait('#MailboxLink')
        .click('#MailboxLink')

      const alert = await n.exists('#AlertNotification')
      should(alert).equal(true)
      const unread = await n.evaluate(() => document.querySelector('.unread') && +document.querySelector('.unread').innerText)
      should(unread).equal(2)
      const hasInvite = await n.exists('.invite-message')
      should(hasInvite).equal(true)
      const hasMessage = await n.exists('.inbox-message')
      should(hasMessage).equal(true)
      const accept = await n
        .click('.invite-message')
        .exists('#AcceptLink')
      should(accept).equal(true)
    })
    it('Should Accept Invite', async function () {
      this.timeout(30000)
      // Accept invitation
      let success = await n.click('#AcceptLink')
        .wait('#Inbox')
        .exists('#Inbox')
      should(success).equal(true)
      // Logout
      success = await n
        .click('#OpenProfileDropDown')
        .click('#LogoutBtn')
        // Open login modal
        .wait('#LoginBtn')
        .click('#LoginBtn')
        // Login
        .wait('#LoginModal.is-active')
        .wait('#LoginName')
        .insert('#LoginName', username + '2')
        .insert('#LoginPassword', 'testtest')
        .click('#LoginButton')
        .wait(() => !document.querySelector('#LoginModal.is-active'))
        .wait('#MailboxLink')
      // BUG: Why isn't there an await here?
      // Accept invitation
      n.click('#MailboxLink')
        .wait('.invite-message')
        .click('.invite-message')
        .wait('#AcceptLink')
        .click('#AcceptLink')
        .wait('#Inbox')
        .exists('#Inbox')
      should(!success).equal(true)
    })
    it('Should Vote on Additional Members', async function () {
      this.timeout(10000)
      await n
        .click('#OpenProfileDropDown')
        .click('#LogoutBtn')
        // Open login modal
        .wait('#LoginBtn')
        .click('#LoginBtn')
        // Login
        .wait('#LoginModal.is-active')
        .wait('#LoginName')
        .insert('#LoginName', username + '5')
        .insert('#LoginPassword', 'testtest')
        .wait('#LoginButton')
        .click('#LoginButton')
        .wait(() => !document.querySelector('#LoginModal.is-active'))
      // BUG: Why isn't there an await here?
      await n
        .wait('#MailboxLink')
        .goto(page('invite'))
        .wait('input[name="invitee"]')
        .insert('input[name="invitee"]', username + 3)
        .click('#addButton')
        .wait(() => document.querySelectorAll('.invitee').length > 0)
        .click('button[type="submit"]')
        .wait('.notification.is-success')
        // Logout
        .click('#OpenProfileDropDown')
        .click('#LogoutBtn')
        // Open login modal
        .wait('#LoginBtn')
        .click('#LoginBtn')
      // Login
      await n
        .wait('#LoginModal.is-active')
        .insert('#LoginName', username)
        .insert('#LoginPassword', 'testtest')
        .click('#LoginButton')
        .wait(() => !document.querySelector('#LoginModal.is-active'))

      let success = await n
        .wait('#MailboxLink')
        .click('#MailboxLink')
        .wait('.proposal-message')
        .click('.proposal-message')
        .wait('#ForLink')
        .click('#ForLink')
        .wait('#Inbox')
        .exists('#Inbox')
      should(success).equal(true)

      success = await n
        .click('#OpenProfileDropDown')
        .click('#LogoutBtn')
        // Open login modal
        .wait('#LoginBtn')
        .click('#LoginBtn')
        // Login
        .wait('#LoginModal.is-active')
        .insert('#LoginName', username + '2')
        .insert('#LoginPassword', 'testtest')
        .click('#LoginButton')
        .wait(() => !document.querySelector('#LoginModal.is-active'))
        .wait('#MailboxLink')
        .click('#MailboxLink')
        .wait('.proposal-message')
        .click('.proposal-message')
        .wait('#ForLink')
        .click('#ForLink')
        .wait('#Inbox')
        .exists('#Inbox')
      should(success).equal(true)

      success = await n
        .click('#OpenProfileDropDown')
        .click('#LogoutBtn')
        // Open login modal
        .wait('#LoginBtn')
        .click('#LoginBtn')
        // Login
        .wait('#LoginModal.is-active')
        .insert('#LoginName', username + '3')
        .insert('#LoginPassword', 'testtest')
        .click('#LoginButton')
        .wait(() => !document.querySelector('#LoginModal.is-active'))
        .wait('#MailboxLink')
        // Accept invitation
        .click('#MailboxLink')
        .wait('.invite-message')
        .exists('.invite-message')
      should(success).equal(true)
    })
  })

  describe.skip('Test Localization Gathering Function', function () {
    it('Verify output of transform functions', function () {
      const script = `
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
      const path = 'script.vue'
      fs.writeFileSync(path, script)
      const output = 'translation.json'
      const args = ['scripts/i18n.js', path, output]
      exec('node', args)
      const json = fs.readFileSync(output, 'utf8')
      const localeObject = JSON.parse(json)
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

  // NOTE: we no longer support EJS
  describe.skip('EJS test page', function () {
    it('List should have at least two items', function () {
      this.timeout(5000)
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
  this.evaluate_now(() => {
    const width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
    const height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
    return { height, width }
  }, done)
})
