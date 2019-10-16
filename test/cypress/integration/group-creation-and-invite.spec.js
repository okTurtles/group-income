describe('Group Creation and Inviting Members', () => {
  const userId = Math.floor(Math.random() * 10000)
  const groupName = 'Dreamers'

  it('successfully loads the homepage', function () {
    cy.visit('/')
  })

  it('register user1, user2 and user3', () => {
    cy.giSignUp(`user1-${userId}`)
    cy.giLogOut()
    cy.giSignUp(`user2-${userId}`)
    cy.giLogOut()
    cy.giSignUp(`user3-${userId}`)
    cy.giLogOut()
  })

  it('user1 logins back and creates a group', () => {
    cy.giLogin(`user1-${userId}`)

    cy.giCreateGroup(groupName, {
      income: 400
    })
    cy.getByDT('profileName').should('contain', `user1-${userId}`)

    cy.getByDT('welcomeGroup').should('contain', `Welcome ${groupName}!`)
  })

  it('user1 starts inviting user2 and user3 to the group', () => {
    cy.getByDT('inviteButton').click()

    cy.getByDT('invitee').within(() => {
      cy.get('input').clear().type(`user2-${userId}`)
      cy.getByDT('add', 'button').click()
      cy.getByDT('feedbackMsg').should('contain', 'Ready to be invited!')
    })

    cy.getByDT('addMorePeople').click()

    cy.getByDT('invitee').eq(1).within(() => {
      cy.get('input').clear().type(`user3-${userId}`)
      cy.getByDT('add', 'button').click()
      cy.getByDT('feedbackMsg').should('contain', 'Ready to be invited!')
    })
  })

  it('user1 removes user3 from invitation list and cancels process', () => {
    cy.getByDT('invitee').eq(1).within(() => {
      cy.getByDT('remove').click()
    })

    cy.getByDT('invitee').should('have.length', 1)

    cy.getByDT('closeModal').click()
  })

  it('user1 decides to actually invite user2 and user3 to the group', () => {
    cy.giInviteMember([`user2-${userId}`, `user3-${userId}`])

    cy.giLogOut()
  })

  function assertGroupMembersCount (count) {
    // OPTIMIZE: We could also verify the username of each member...
    cy.getByDT('groupMembers').find('ul')
      .children()
      .should('have.length', count)
  }

  it('user2 accepts the invite', () => {
    cy.giLogin(`user2-${userId}`)
    cy.giAcceptGroupInvite(groupName)
    assertGroupMembersCount(2)
    cy.giLogOut()
  })

  it('user3 accepts the invite', () => {
    cy.giLogin(`user3-${userId}`)
    cy.giAcceptGroupInvite(groupName)
    assertGroupMembersCount(3)
    cy.giLogOut()
  })
})
