const API_URL = Cypress.config('baseUrl')

describe('Group Income - Removing contracts', () => {
  const userId = performance.now().toFixed(20).replace('.', '')
  const groupName = 'Dreamers'

  it('user1 creates a group and removes it', () => {
    cy.visit('/')
    cy.giSignup(`user1-${userId}`, { bypassUI: true })

    cy.giCreateGroup(groupName, { bypassUI: true })

    cy.giLeaveGroup()

    cy.getByDT('modal', 'div').within(() => {
      cy.window().its('sbp').then(sbp => {
        const { currentGroupId } = sbp('state/vuex/state')
        cy.request(`${API_URL}/file/${currentGroupId}`).its('status').should('eq', 200)
        cy.getByDT('confirmation').type(`{selectall}{del}DELETE ${groupName.toUpperCase()}`)
        cy.getByDT('btnSubmit', '.is-danger').click()

        cy.url().should('eq', `${API_URL}/app/`)
        cy.request({ url: `${API_URL}/file/${currentGroupId}`, failOnStatusCode: false }).its('status').should('eq', 410)
      })
    })

    cy.getByDT('welcomeHomeLoggedIn').should('contain', 'Let’s get this party started')
  })

  it('user2 creates a new group', () => {
    cy.giCreateGroup(groupName, { bypassUI: true })

    cy.giGetInvitationAnyone().then(invitationLink => {
      cy.giLogout({ bypassUI: true })

      cy.giAcceptGroupInvite(invitationLink, {
        username: `user2-${userId}`,
        existingMemberUsername: `user1-${userId}`,
        groupName: groupName,
        bypassUI: true
      })

      cy.giLogin(`user1-${userId}`, { bypassUI: true })
      cy.getByDT('settingsBtn').click()
      cy.getByDT('tabDeleteAccount').click()
      cy.getByDT('deleteAccount').click()

      cy.getByDT('deleteAccount', 'form').within(() => {
        cy.window().its('sbp').then(sbp => {
          const { currentGroupId } = sbp('state/vuex/state')
          cy.request(`${API_URL}/file/${currentGroupId}`).its('status').should('eq', 200)

          cy.getByDT('username').type(`{selectall}{del}user1-${userId}`)
          cy.getByDT('password').type('{selectall}{del}123456789')
          cy.getByDT('confirmation').type('{selectall}{del}DELETE ACCOUNT')

          cy.getByDT('btnSubmit').click()

          cy.url().should('eq', `${API_URL}/app/`)
          cy.request({ url: `${API_URL}/file/${currentGroupId}`, failOnStatusCode: false }).its('status').should('eq', 410)
        })
      })

      cy.getByDT('welcomeHome').should('contain', 'Welcome to Group Income')
    })

    cy.giLogin(`user2-${userId}`, { bypassUI: true, toGroupDashboardUponSuccess: false })
    cy.getByDT('welcomeHomeLoggedIn').should('contain', 'Let’s get this party started')
    cy.giLogout({ bypassUI: true })
  })
})
