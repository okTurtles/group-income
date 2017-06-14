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
  const n = Nightmare({
    show: !!process.env.SHOW_BROWSER,
    height: 900
  })

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

  describe('Event Log Test', function () {
    it.skip('Should Append to the log', async function () {
      this.timeout(5000) // this one takes a while for some reason
      await n.goto(page('event-log'))
        .should.finally.containEql({ code: 200, url: page('event-log') })
      const result = await n.wait('#random').evaluate(() => ({
        current: document.getElementById('LogPosition').innerText,
        eventCount: document.querySelectorAll('.event').length
      }))
      await n.click('#random')
        .wait(() => +document.getElementById('count').innerText > 0)
      const obj = await n.insert('textarea[name="payload"]', 'This is a test payment event')
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
    it.skip('Should Traverse Log', async function () {
      this.timeout(4000)
      await n.goto(page('event-log'))
      const prior = await n.evaluate(() => document.getElementById('LogPosition').innerText)
      const initial = await n.wait('textarea[name="payload"]')
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
      this.timeout(8000)
      await n.goto(page('signup'))
        .wait('#name')
      const signedup = await n.insert('#name', username)
        .insert('#email', `test@testgroupincome.com`)
        .insert('#password', 'testtest')
        .wait(() => !document.querySelector('button[type="submit"]').disabled)
        .click('button[type="submit"]')
        .wait('#HomeLogo')
        .evaluate(() => !!document.getElementById('HomeLogo'))
      should(signedup).equal(true)
      /*
      await n.insert('#name')
        .insert('#email')
        .insert('#password')
        .wait(() => !document.getElementById('name').innerText &&
        !document.getElementById('email').innerText &&
        !document.getElementById('password').innerText)
        */
    })
    it('Test Profile Change', async function () {
      this.timeout(10000)
      let success = await n.click('#ProfileLink')
        .wait('input[name="profilePicture"]')
        .insert('textarea[name="bio"]', 'Born in a test case')
        .insert('input[name="displayName"]', 'Tester T Test')
        .insert('textarea[name="bio"]', 'Born in a test case')
        .click('#SaveProfileButton')
        .wait(() => !!document.getElementById('ProfileSaveSuccess'))
        .evaluate(() => !!document.getElementById('ProfileSaveSuccess'))
      should(success).equal(true)
      // TODO Make more complex. Unfortunately bugs in Nightmare prevent the clearing and re-entering of fields
    })
    it('Test Logout and Login', async function () {
      this.timeout(6000)
      const loggedin = await n
        // Logout
        .click('#LogoutBtn')

        // Open login modal
        .wait(() => Boolean(document.querySelector('#LoginBtn')))
        .click('#LoginBtn')

        // Login
        .wait(() => Boolean(document.querySelector('#LoginModal.is-active')))
        .wait(1000)
        .insert('#LoginName', username)
        .insert('#LoginPassword', 'testtest')
        .wait(1000)
        .click('#LoginButton')
        .wait(() => Boolean(document.querySelector('#LoginResponse')))
        .wait(1000)
        .evaluate(() => Boolean(document.querySelector('#LogoutBtn')))
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
        .evaluate(() => document.querySelector('button[type="submit"]').disabled)
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
    it('Create Additional User 2', async function () {
      this.timeout(8000)
      const signedup = await n.click('#LogoutBtn')
        .wait('#SignupBtn')
        .click('#SignupBtn')
        .wait('#name')
        .insert('#name', username + '2')
        .insert('#email', 'test2@testgroupincome.com')
        .insert('#password', 'testtest')
        .wait(() => !document.querySelector('button[type="submit"]').disabled)
        .click('button[type="submit"]')
        .wait('#HomeLogo')
        .evaluate(() => Boolean(document.querySelector('#HomeLogo')))
      should(signedup).equal(true)
    })

    it('Create Additional User 3', async function () {
      this.timeout(8000)
      const signedup = await n
        .click('#LogoutBtn')
        .wait('#SignupBtn')
        .click('#SignupBtn')
        .wait('#name')
        .insert('#name', username + '3')
        .insert('#email', `test2@testgroupincome.com`)
        .insert('#password', 'testtest')
        .wait(() => !document.querySelector('button[type="submit"]').disabled)
        .click('button[type="submit"]')
        .wait('#HomeLogo')
        .evaluate(() => Boolean(document.querySelector('#HomeLogo')))
      should(signedup).equal(true)
    })

    it('Create Additional User 4', async function () {
      this.timeout(8000)
      const signedup = await n
        .click('#LogoutBtn')
        .wait('#SignupBtn')
        .click('#SignupBtn')
        .wait('#name')
        .insert('#name', username + '4')
        .insert('#email', `test2@testgroupincome.com`)
        .insert('#password', 'testtest')
        .wait(() => !document.querySelector('button[type="submit"]').disabled)
        .click('button[type="submit"]')
        .wait('#HomeLogo')
        .evaluate(() => Boolean(document.querySelector('#HomeLogo')))
      should(signedup).equal(true)
    })

    it('Create Additional User 5', async function () {
      this.timeout(8000)
      const signedup = await n
        .click('#LogoutBtn')
        .wait('#SignupBtn')
        .click('#SignupBtn')
        .wait('#name')
        .insert('#name', username + '5')
        .insert('#email', `test2@testgroupincome.com`)
        .insert('#password', 'testtest')
        .wait(() => !document.querySelector('button[type="submit"]').disabled)
        .click('button[type="submit"]')
        .wait('#HomeLogo')
        .evaluate(() => Boolean(document.querySelector('#HomeLogo')))
      should(signedup).equal(true)
    })

    it('Should create a group', async function () {
      this.timeout(10000)
      await n.click('#CreateGroup')
      const created = await n
        .insert('input[name="groupName"]', 'Test Group')
        .insert('textarea[name="sharedValues"]', 'Testing this software')
        .insert('input[name="groupName"]', 'Test Group')
        .insert('input[name="incomeProvided"]', 200)
        // .insert('input[name="proxyChangePercentage"]', 75)
        // .insert('input[name="proxyMemberApprovalPercentage"]', 75)
        // .insert('input[name="proxyMemberRemovalPercentage"]', 75)
        .select('select[name="contributionPrivacy"]', 'Very Private')
        .click('button[type="submit"]')
        // Should get to invite page:
        .wait(500)
        .wait(() => !!document.getElementById('addButton'))
        .evaluate(() => !!document.getElementById('addButton'))
      should(created).equal(true)
    })

    it('Should invite members to group', async function () {
      this.timeout(4000)

      const count = await n
        .wait(() => Boolean(document.querySelector('#addButton')))
        .insert('#searchUser', username)
        .click('#addButton')
        .wait(() => document.querySelectorAll('.member').length > 0)
        .wait(225)
        .click('.delete')
        .wait(225)
        .wait(() => document.querySelectorAll('.member').length < 1)
        .evaluate(() => +document.querySelectorAll('.member').length)
      should(count).equal(0)

      const created = await n
        .insert('#searchUser', username)
        .click('#addButton')
        .wait(() => document.querySelectorAll('.member').length > 0)
        .insert('#searchUser', username + '2')
        .click('#addButton')
        .wait(() => document.querySelectorAll('.member').length > 1)
        .click('button[type="submit"]')
        .wait(() => !!document.querySelector('.notification.is-success'))
        .evaluate(() => !!document.querySelector('.notification.is-success'))
      should(created).equal(true)
    })

    it('Should Receive Message and Invite', async function () {
      this.timeout(20000)
      await n.goto(page('mailbox'))
        .wait('#Inbox')
        .click('#ComposeLink')
        .wait('#AddRecipient')
        .insert('#AddRecipient', username)
        .insert('#ComposedMessage', 'Best test ever!!')
        .click('#SendButton')
        .wait('#Inbox')

        // Logout
        .click('#LogoutBtn')

        // Login
        .wait('#LoginBtn')
        .click('#LoginBtn')
        .wait(() => Boolean(document.querySelector('#LoginModal')))
        .insert('#LoginName', username)
        .insert('#LoginPassword', 'testtest')
        .click('#LoginButton')
        .wait(() => Boolean(document.querySelector('#LogoutBtn')))
        .wait('#MailboxLink')
        .click('#MailboxLink')
        .wait('#Inbox').wait(1000).click('#MailboxLink')
      const alert = await n.evaluate(() => !!document.getElementById('AlertNotification'))
      should(alert).equal(true)
      const unread = await n.evaluate(() => document.querySelector('.unread') && +document.querySelector('.unread').innerText)
      should(unread).equal(2)
      const hasInvite = await n.evaluate(() => !!document.getElementsByClassName('invite-message'))
      should(hasInvite).equal(true)
      const hasMessage = await n.evaluate(() => !!document.getElementsByClassName('inbox-message'))
      should(hasMessage).equal(true)
      const newUnread = await n.click('.invite-message')
        .wait(300)
        .evaluate(() => +document.querySelector('.unread').innerText)
      should(newUnread).equal(1)
    })
    it('Should Accept Invite', async function () {
      this.timeout(30000)
      // Accept invitation
      let success = await n.click('#InboxLink')
        .wait('.invite-message')
        .click('.invite-message')
        .wait(240)
        .click('#InviteLink')
        .wait('#AcceptLink')
        .click('#AcceptLink')
        .wait('#Inbox')
        .evaluate(() => !!document.getElementById('Inbox'))
      should(success).equal(true)
      // Logout
      success = await n.click('#LogoutBtn')
      // Open login modal
        .wait(() => Boolean(document.querySelector('#LoginBtn')))
        .click('#LoginBtn')
        // Login
        .wait(() => Boolean(document.querySelector('#LoginModal.is-active')))
        .wait(1000)
        .insert('#LoginName', username + '2')
        .insert('#LoginPassword', 'testtest')
        .wait(1000)
        .click('#LoginButton')
        .wait(1000)
        .wait('#MailboxLink')
        // Accept invitation
        .click('#MailboxLink')
        .wait('.invite-message')
        .click('.invite-message')
        .wait(240)
        .click('#InviteLink')
        .wait('#AcceptLink')
        .click('#AcceptLink')
        .wait('#Inbox')
        .evaluate(() => !!document.getElementById('Inbox'))
      should(success).equal(true)
      let memberCount = await n.click('#LogoutBtn')
      // Open login modal
        .wait(() => Boolean(document.querySelector('#LoginBtn')))
        .click('#LoginBtn')
        // Login
        .wait(() => Boolean(document.querySelector('#LoginModal.is-active')))
        .wait(1000)
        .insert('#LoginName', username + '5')
        .insert('#LoginPassword', 'testtest')
        .wait(1000)
        .click('#LoginButton')
        .wait('#MailboxLink')
        .goto(page('invite'))
        .wait(() => Boolean(document.querySelector('#addButton')))
        .evaluate(() => +document.querySelectorAll('.currentmember').length)
      // Check if members successfully joined
      should(memberCount).equal(3)
    })
    it('Should Vote on Additional Members', async function () {
      this.timeout(60000)
      let success = await n.wait(() => Boolean(document.querySelector('#addButton')))
        .insert('#searchUser', username + '3')
        .click('#addButton')
        .wait(() => document.querySelectorAll('.member').length > 0)
        .insert('#searchUser', username + '4')
        .click('#addButton')
        .wait(() => document.querySelectorAll('.member').length > 1)
        .click('button[type="submit"]')
        .wait(() => !!document.querySelector('.notification.is-success'))
        .evaluate(() => !!document.querySelector('.notification.is-success'))
        // Logout
        .click('#LogoutBtn')
        // Open login modal
        .wait(() => Boolean(document.querySelector('#LoginBtn')))
        .click('#LoginBtn')
      // Login
      success = await n.wait(() => Boolean(document.querySelector('#LoginModal.is-active')))
        .wait(1000)
        .insert('#LoginName', username)
        .insert('#LoginPassword', 'testtest')
        .wait(1000)
        .click('#LoginButton')
        .wait(1000)
        .click('#MailboxLink')
        .wait('.proposal-message')
        .click('.proposal-message')
        .wait(1000)
        .click('#ProposalLink')
        .wait('#ForLink')
        .click('#ForLink')
        .wait('#Inbox')
        .evaluate(() => !!document.getElementById('Inbox'))
      should(success).equal(true)
      success = await n.click('#LogoutBtn')
      // Open login modal
        .wait(() => Boolean(document.querySelector('#LoginBtn')))
        .click('#LoginBtn')
        // Login
        .wait(() => Boolean(document.querySelector('#LoginModal.is-active')))
        .wait(1000)
        .insert('#LoginName', username + '2')
        .insert('#LoginPassword', 'testtest')
        .wait(1000)
        .click('#LoginButton')
        .wait(1000)
        .wait('#MailboxLink')
        .click('#MailboxLink')
        .wait('.proposal-message')
        .click('.proposal-message')
        .wait(240)
        .click('#ProposalLink')
        .wait('#ForLink')
        .click('#ForLink')
        .wait('#Inbox')
        .evaluate(() => !!document.getElementById('Inbox'))
      should(success).equal(true)
      success = await n.click('#LogoutBtn')
      // Open login modal
        .wait(() => Boolean(document.querySelector('#LoginBtn')))
        .click('#LoginBtn')
        // Login
        .wait(() => Boolean(document.querySelector('#LoginModal.is-active')))
        .wait(1000)
        .insert('#LoginName', username + '3')
        .insert('#LoginPassword', 'testtest')
        .wait(1000)
        .click('#LoginButton')
        .wait(1000)
        .wait('#MailboxLink')
        // Accept invitation
        .click('#MailboxLink')
        .wait('.invite-message')
        .evaluate(() => !!document.querySelector('.invite-message'))
      should(success).equal(true)
    })
  })

  describe('Test Localization Gathering Function', function () {
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
  this.evaluate_now(() => {
    const width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
    const height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
    return { height, width }
  }, done)
})
