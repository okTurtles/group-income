import { randomUserSuffix } from '../support/lib.js'

const groupName = 'Dreamers'
const user1 = `user1${randomUserSuffix()}`
// Sent to the group chat. The journal redactions must keep it out of the
// exported journals.
const secretMessage = `journal export secret ${randomUserSuffix()}`
const LOGS_FILENAME = 'gi_logs.json.txt'

// Makes the app believe it runs on a touch device whose browser has the Web
// Share API: neither the Cypress viewport nor Electron offers one.
function fakeShareSupport ({ canShare, share }) {
  cy.window().then(win => {
    // The stub is removed after each test; within a test, only stub once.
    if (!win.matchMedia.isSinonProxy) {
      const matchMedia = win.matchMedia.bind(win)
      cy.stub(win, 'matchMedia').callsFake(query => /pointer: coarse|max-width: 1199px/.test(query)
        ? { matches: true, media: query, addListener () {}, removeListener () {}, addEventListener () {}, removeEventListener () {} }
        : matchMedia(query)
      )
    }
    Object.defineProperty(win.navigator, 'canShare', { configurable: true, value: canShare })
    Object.defineProperty(win.navigator, 'share', { configurable: true, value: share })
    win.dispatchEvent(new win.Event('resize'))
  })
}

function removeFakeShareSupport () {
  cy.window().then(win => {
    delete win.navigator.canShare
    delete win.navigator.share
  })
}

// Download attempts, i.e. clicks on the hidden `<a download>`.
function spyOnDownloads () {
  cy.window().then(win => {
    cy.spy(win.HTMLAnchorElement.prototype, 'click').as('anchorClick')
  })
}

function downloadAttempts (spy) {
  return spy.thisValues.filter(el => el.download === LOGS_FILENAME).length
}

describe('Application logs export', () => {
  it('user1 creates a group and sends a chat message', () => {
    cy.visit('/')
    cy.giSignup(user1, { bypassUI: true })
    cy.giCreateGroup(groupName, { bypassUI: true })
    cy.giRedirectToGroupChat()
    cy.giSendMessage(user1, secretMessage)

    cy.getByDT('settingsBtn').click()
    cy.getByDT('tabApplicationLogs').click()
  })

  it('downloads the logs with redacted contract journals', () => {
    cy.getByDT('includeJournal').check({ force: true })
    cy.getByDT('downloadLogs').should('contain', 'Download').click()

    cy.window().its('sbp').then(sbp => sbp('state/vuex/state').loggedIn.identityContractID).then(identityContractID => {
      cy.readFile(`${Cypress.config('downloadsFolder')}/${LOGS_FILENAME}`).then(content => {
        const file = JSON.parse(content)
        expect(file.includeJournal).to.equal(true)
        expect(file.journalTruncated).to.equal(false)
        expect(file).not.to.have.property('journalError')

        const contractIDs = Object.keys(file.journals)
        // The user's own identity is ranked first.
        expect(contractIDs[0]).to.equal(identityContractID)
        const types = contractIDs.map(id => file.journals[id].type)
        expect(types).to.include.members(['gi.contracts/identity', 'gi.contracts/group', 'gi.contracts/chatroom'])

        // The message is journaled, but only in redacted form.
        const journals = JSON.stringify(file.journals)
        expect(journals).not.to.contain(secretMessage)
        const chatroomJournals = contractIDs
          .filter(id => file.journals[id].type === 'gi.contracts/chatroom')
          .map(id => JSON.stringify(file.journals[id].journal))
        expect(chatroomJournals.some(journal => journal.includes('"text":"xxxxxxxx"'))).to.equal(true)
      })
    })
    cy.getByDT('appLogsMsg').should('not.exist')
  })

  it('offers Share only where the browser can share a file', () => {
    const share = () => Promise.resolve()

    // Firefox for Android: `navigator.share` exists, but files can't be shared.
    fakeShareSupport({ canShare: () => false, share })
    cy.getByDT('downloadLogs').should('contain', 'Download')

    fakeShareSupport({ canShare: () => true, share })
    cy.getByDT('downloadLogs').should('contain', 'Share')
    removeFakeShareSupport()
  })

  it('downloads the file instead when sharing it fails', () => {
    cy.window().then(win => {
      const share = cy.stub().as('share').rejects(new win.TypeError('Passing files is currently not supported.'))
      fakeShareSupport({ canShare: () => true, share })
    })
    spyOnDownloads()
    cy.getByDT('downloadLogs').should('contain', 'Share').click()

    cy.get('@share').should('have.been.calledOnce').then(share => {
      expect(share.firstCall.args[0].files[0].name).to.equal(LOGS_FILENAME)
    })
    cy.getByDT('downloadLogs').should('not.be.disabled')
    cy.get('@anchorClick').should(spy => {
      expect(downloadAttempts(spy)).to.equal(1)
    })
    cy.getByDT('appLogsMsg').should('not.exist')
    removeFakeShareSupport()
  })

  it('does nothing when the share sheet is dismissed', () => {
    cy.window().then(win => {
      const share = cy.stub().as('share').rejects(new win.DOMException('Abort due to cancellation of share.', 'AbortError'))
      fakeShareSupport({ canShare: () => true, share })
    })
    spyOnDownloads()
    cy.getByDT('downloadLogs').should('contain', 'Share').click()

    cy.get('@share').should('have.been.calledOnce')
    cy.getByDT('downloadLogs').should('not.be.disabled')
    cy.get('@anchorClick').should(spy => {
      expect(downloadAttempts(spy)).to.equal(0)
    })
    cy.getByDT('appLogsMsg').should('not.exist')
    removeFakeShareSupport()
  })

  it('user1 logs out', () => {
    // Logging out while the logs screen is open takes over 30 seconds, so
    // leave it first.
    cy.getByDT('backToMenu').click()
    cy.getByDT('downloadLogs').should('not.exist')
    cy.giLogout({ bypassUI: true })
  })
})
