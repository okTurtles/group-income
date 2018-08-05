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

// Access any element by its data-test attribute
function elT (el) {
  return `[data-test="${el}"]`
}

function page (page) {
  return url.resolve(process.env.FRONTEND_URL, `simple/${page}`)
}

// TODO: consider converting these to Nightmare actions that check if we're
//       logged in/logged out and then act appropriately (e.g. instead of
//       `n.use(logout())` we do `n.logoutIfLoggedIn()` or `n.logoutAndLogin()`?)
function logout () {
  return function (n) {
    n.wait(elT('openProfileDropDown'))
      .click(elT('openProfileDropDown'))
      .click(elT('logoutBtn'))
  }
}

function login (name) {
  return function (n) {
    n.wait(elT('loginBtn'))
      .click(elT('loginBtn'))
      .wait(elT('modal'))
      .insert(elT('loginName'), name)
      .insert(elT('loginPassword'), 'testtest')
      .click(elT('loginSubmit'))
      // we don't check the specific name because the display name could have been modified
      .wait(elT('profileDisplayName'))
  }
}

function signup (name, email, password) {
  return function (n) {
    n.goto(page('/'))
      .wait(elT('signupBtn'))
      .click(elT('signupBtn'))
      .wait(elT('modal'))
      .insert(elT('signName'), name)
      .insert(elT('signEmail'), email)
      .insert(elT('signPassword'), password)
      .wait(el => !document.querySelector(el).disabled, elT('signSubmit'))
      .click(elT('signSubmit'))
      .wait((el, name) => {
        var it = document.querySelector(el)
        return it && it.innerText === name
      }, elT('profileDisplayName'), name)
  }
}

// .use() this during debugging to track down which Nightmare action is failing`
function note (message) {
  return function (n) {
    n.wait(msg => { console.error('[NIGHTMARE NOTE]: ' + msg); return true }, message)
  }
}

// example of how to extend nightmare with custom functions, see
// https://github.com/segmentio/nightmare#nightmareactionname-electronactionelectronnamespace-actionnamespace
Nightmare.action('size', function (done) {
  this.evaluate_now(() => {
    const width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
    const height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
    return { height, width }
  }, done)
})

describe('Frontend', function () {
  const n = Nightmare({
    openDevTools: { mode: 'detach' },
    show: !!process.env.SHOW_BROWSER,
    // these need to be short, definitely much shorter than mocha timeouts
    // in order to get useful debugging information
    // NOTE: you can change the wait and execution timeouts to higher numbers
    //       like 60000 to facility with SHOW_BROWSER based debugging
    // waitTimeout: 60000,
    waitTimeout: 2000,
    executionTimeout: 1000,
    height: 900
  })
  n.on('page', (type, msg, stack) => {
    if (type === 'error') {
      console.log('!! [NIGHTMARE] page error:', msg, 'stack:', stack)
    }
  })
  n.on('console', (type, args) => {
    if (type === 'error') {
      var idx = -1
      if (args.indexOf) idx = args.indexOf('[NIGHTMARE NOTE]: ')
      if (idx !== -1) {
        console.log('!! ' + args.slice(idx))
      } else {
        console.log('!! [NIGHTMARE] console error:', args)
      }
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
      return n.use(signup('George', 'george@lasvegas.com', '$$111$$'))
    })

    it.skip('Should fail to create George again', function () {
      return n.click('.signup button.submit')
        .wait(() => document.getElementById('serverMsg').className.indexOf('danger') !== -1)
    })
  })

  describe('Sign up Test', function () {
    it('Should register User', function () {
      this.timeout(10000)
      return n.use(signup(username, 'test@testgroupincome.com', 'testtest'))
    })

    it('Test Profile Change', function () {
      this.timeout(10000)
      return n
        .click(elT('openProfileDropDown'))
        .click(elT('profileLink'))
        .wait(elT('profilePicture'))
        .insert(elT('bio'), 'Born in a test case')
        .insert(elT('displayName'), 'Tester T Test')
        .insert(elT('bio'), 'Born in a test case')
        .insert(elT('profilePicture')) // clear
        .insert(elT('profilePicture'), 'http://testing.rocks')
        .insert(elT('profileEmail')) // clear
        .insert(elT('profileEmail'), 'email@testing.rocks')
        .click(elT('submit'))
        .wait(elT('profileSaveSuccess'))
        .exists(elT('profileSaveSuccess'))
      // TODO Make more complex. Unfortunately bugs in Nightmare prevent the clearing and re-entering of fields
      // those Nightmare bugs seem to be gone now, so TODO it is
    })
    it('Test Logout and Login', function () {
      this.timeout(10000)
      return n.use(logout()).use(note('logout -> login to: ' + username)).use(login(username))
    })

    /* There appears to be a bug in nightmare that causes the insert and type commands to enter old data into the field if the
    insert or type commands or used more than once on the same field. This concatenates the old values to the new.
    This occurs regardless of whether you clear the field or not. Until its fixed skip this validation test
    */
    // TODO: implement this now that we're using `type` instead of `insert`
    it.skip('Test Validation', async function () {
      this.timeout(4000)
      await n.goto(page('/'))
      const badUsername = 't e s t'
      const badEmail = `@fail`
      const badPassword = `789`// six is so afraid
      const denied = await n.insert(elT('signName'), badUsername)
        .insert(elT('signEmail'), badEmail)
        .insert(elT('signPassword'), badPassword)
        .evaluate(
          (el) => document.querySelector(el) && document.querySelector(el).disabled,
          elT('signSubmit')
        )
      should(denied).equal(true)

      const usernameMsg = await n.evaluate(
        (el) => !!document.querySelector(el),
        elT('badUsername')
      )
      should(usernameMsg).equal(true)

      const emailMsg = await n.evaluate(
        (el) => !!document.querySelector(el),
        elT('badEmail')
      )
      should(emailMsg).equal(true)

      const passwordMsg = await n.evaluate(
        (el) => !!document.querySelector(el),
        elT('badPassword')
      )
      should(passwordMsg).equal(true)
    })
  })

  describe('Group Creation Test', function () {
    it('Create Additional User', function () {
      this.timeout(8000)
      return n.use(logout()).use(signup(username + '2', 'test2@testgroupincome.com', 'testtest'))
    })

    it('Create Additional User 3', function () {
      this.timeout(8000)
      return n.use(logout()).use(signup(username + '3', 'test3@testgroupincome.com', 'testtest'))
    })

    it('Create Additional User 4', function () {
      this.timeout(8000)
      return n.use(logout()).use(signup(username + '4', 'test4@testgroupincome.com', 'testtest'))
    })

    it('Create Additional User 5', function () {
      this.timeout(8000)
      return n.use(logout()).use(signup(username + '5', 'test5@testgroupincome.com', 'testtest'))
    })

    it('Should create a group', async function () {
      const testName = 'Test Group'
      const testValues = 'Testing this software'
      const testIncome = 200
      const testSetting = 80
      this.timeout(10000)
      await n
        .click(elT('createGroup'))
        // fill group data
        .wait(elT('groupName'))
        .insert(elT('groupName'), testName)
        .click(elT('nextBtn'))
        .wait('textarea[name="sharedValues"]')
        .insert('textarea[name="sharedValues"]', testValues)
        .click(elT('nextBtn'))
        .wait('input[name="incomeProvided"]')
        .insert('input[name="incomeProvided"]', testIncome)
        .click(elT('nextBtn'))
        .wait(elT('rulesStep'))
        // set rules step skipped for now
        .click(elT('nextBtn'))
        .wait(elT('privacyStep'))
        .click(elT('nextBtn'))
        // invite members
        .wait(elT('searchUser'))
        .insert(elT('searchUser'), username + '4')
        .click(elT('addButton'))
        .wait(elT('member'))

      const invited = await n.evaluate(el => document.querySelectorAll(el).length, elT('member'))
      should(invited).equal(1)

      await n.click(elT('nextBtn')).wait(elT('summaryStep'))
      // summary page sees group as valid
      const valid = await n.exists(`${elT('finishBtn')}:not(:disabled)`)
      should(valid).equal(true)
      // submit group
      await n.click(elT('finishBtn')).wait(elT('dashboard'))

      const created = await n.evaluate(() => ({
        groupName: document.querySelector('[data-test="groupName"]').innerText,
        sharedValues: document.querySelector('[data-test="sharedValues"]').innerText,
        incomeProvided: document.querySelector('[data-test="minIncome"]').innerText,
        changePercentage: document.querySelector('[data-test="changePercentage"]').innerText,
        memberApprovalPercentage: document.querySelector('[data-test="approvePercentage"]').innerText,
        memberRemovalPercentage: document.querySelector('[data-test="removePercentage"]').innerText
      }))
      should(created.groupName).equal(testName)
      should(created.sharedValues).equal(testValues)
      // BUG: TODO: this field should not include the currency
      //      TODO: the currency should be checked separately via data-test="incomeCurrency"
      should(created.incomeProvided).equal('$' + testIncome)
      should(created.changePercentage).equal(testSetting + '%')
      should(created.memberApprovalPercentage).equal(testSetting + '%')
      should(created.memberRemovalPercentage).equal(testSetting + '%')
    })

    it('Should invite members to group', async function () {
      this.timeout(4000)

      const count = await n
        .click(elT('inviteButton'))
        .wait(elT('addButton'))
        .insert(elT('searchUser'), username)
        .click(elT('addButton'))
        .wait(el => document.querySelectorAll(el).length > 0, elT('member'))
        .wait(elT('deleteMember'))
        .click(elT('deleteMember'))
        .wait(el => document.querySelectorAll(el).length < 1, elT('member'))
        .evaluate(el => +document.querySelectorAll(el).length, elT('member'))
      should(count).equal(0)

      const created = await n
        .insert(elT('searchUser'), username)
        .click(elT('addButton'))
        .wait(el => document.querySelectorAll(el).length > 0, elT('member'))
        .insert(elT('searchUser'), username + '2')
        .click(elT('addButton'))
        .wait(el => document.querySelectorAll(el).length > 1, elT('member'))
        .click(elT('submit'))
        .wait(el => !!document.querySelector(el), elT('notifyInvitedSuccess'))
        .evaluate(el => !!document.querySelector(el), elT('notifyInvitedSuccess'))
      should(created).equal(true)
    })

    it('Should Receive Message and Invite', async function () {
      this.timeout(10000)
      await n
        // .goto(page('mailbox'))
        // TODO: navigation gets redirected on login guard but nav click doesn't?
        // we might have logged in state problems
        // Tracking here:
        // https://github.com/okTurtles/group-income-simple/issues/440
        .wait(elT('mailboxLink'))
        .click(elT('mailboxLink'))
        .wait(elT('inbox'))
        .click(elT('composeLink'))
        .wait(elT('addRecipient'))
        .insert(elT('addRecipient'), username)
        .insert(elT('composedMessage'), 'Best test ever!!')
        .click(elT('sendButton'))
        .wait(elT('inbox'))
        .use(logout())
        .use(login(username))
        .wait(elT('mailboxLink'))
        .click(elT('mailboxLink'))

      const alert = await n.exists(elT('alertNotification'))
      should(alert).equal(true)
      const unread = await n.evaluate(
        el => document.querySelector(el) && +document.querySelector(el).innerText,
        elT('inboxUnread')
      )
      should(unread).equal(2)
      const hasInvite = await n.exists(elT('inviteMessage'))
      should(hasInvite).equal(true)
      const hasMessage = await n.exists(elT('inboxMessage'))
      should(hasMessage).equal(true)
      const accept = await n
        .click(elT('inviteMessage'))
        .wait(elT('acceptLink'))
        .exists(elT('acceptLink'))
      should(accept).equal(true)
    })
    it('Should Accept Invite', async function () {
      this.timeout(30000)
      // Accept invitation
      let success = await n.click(elT('acceptLink'))
        .wait(elT('inbox'))
        .exists(elT('inbox'))
      should(success).equal(true)
      // Logout
      success = await n
        .use(logout())
        .use(login(username + '2'))
        .wait(elT('mailboxLink'))
        // Accept invitation
        .click(elT('mailboxLink'))
        .wait(elT('inviteMessage'))
        .click(elT('inviteMessage'))
        .wait(elT('acceptLink'))
        .click(elT('acceptLink'))
        .wait(elT('inbox'))
        .exists(elT('inbox'))
      should(success).equal(true)
    })
    it('Should Vote on Additional Members', async function () {
      this.timeout(10000)
      await n
        .use(logout())
        .use(login(username + '5'))
        .goto(page('invite'))
        .wait(elT('searchUser'))
        .insert(elT('searchUser'), username + '3')
        .click(elT('addButton'))
        .wait(el => document.querySelectorAll(el).length > 0, elT('member'))
        .click(elT('submit'))
        .wait(elT('notifyInvitedSuccess'))
      // Check vote banner on dashboard
      await n
        .use(logout())
        .use(login(username))
        .goto(page('dashboard'))
        .wait(elT('proposal'))

      let initiator = await n
        .wait(elT('initiator'))
        .evaluate(el => {
          var it = document.querySelector(el)
          return it && it.innerText
        }, elT('initiator'))
      should(initiator).equal(username + '5')

      let candidate = await n
        .wait(elT('proposal'))
        .evaluate(el => {
          var it = document.querySelector(el)
          return it && it.innerText
        }, elT('proposal'))
      should(candidate).containEql(username + '3')
      // Check mailbox
      await n
        .wait(elT('mailboxLink'))
        .click(elT('mailboxLink'))
        .wait(elT('proposalMessage'))
        .click(elT('proposalMessage'))

      candidate = await n
        .wait(elT('candidateName'))
        .evaluate(el => {
          var it = document.querySelector(el)
          return it && it.innerText
        }, elT('candidateName'))
      should(candidate).equal(username + '3')

      let success = await n
        .wait(elT('forLink'))
        .click(elT('forLink'))
        .wait(elT('inbox'))
        .exists(elT('inbox'))
      should(success).equal(true)

      success = await n
        .use(logout())
        .use(login(username + '2'))
        .wait(elT('mailboxLink'))
        .click(elT('mailboxLink'))
        .wait(elT('proposalMessage'))
        .click(elT('proposalMessage'))
        .wait(elT('forLink'))
        .click(elT('forLink'))
        .wait(elT('inbox'))
        .exists(elT('inbox'))
      should(success).equal(true)

      success = await n
        .use(logout())
        .use(login(username + '3'))
        .wait(elT('mailboxLink'))
        // Accept invitation
        .click(elT('mailboxLink'))
        .wait(elT('inviteMessage'))
        .exists(elT('inviteMessage'))
      should(success).equal(true)
    })
    it('Should See Member List on Dashboard', async function () {
      this.timeout(4000)

      await n
        .use(logout())
        .use(login(username + '5'))
        .goto(page('dashboard'))
        .wait(elT('groupMembers'))

      const memberCount = await n
        .wait(elT('member'))
        .evaluate(
          (el) => +document.querySelectorAll(el).length,
          elT('member')
        )
      should(memberCount).equal(3)

      const memberNames = await n
        .wait(elT('username'))
        .evaluate(
          (el) => Array.prototype.map.call(document.querySelectorAll(el), (item) => item.innerText),
          elT('username')
        )
      should(memberNames[0]).equal(username + '5')
      should(memberNames[1]).equal(username)
      should(memberNames[2]).equal(username + '2')
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
