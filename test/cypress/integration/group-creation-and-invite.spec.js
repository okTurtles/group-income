describe('Group Creation and Inviting Members', () => {
  const userId = Math.floor(Math.random() * 10000)
  const groupName = 'Dreamers'

  it('register user1, user2 and user3', () => {
    cy.visit('/')
    cy.giSignUp(`user1-${userId}`)
    cy.giLogOut()
    cy.giSignUp(`user2-${userId}`)
    cy.giLogOut()
    cy.giSignUp(`user3-${userId}`)
    cy.giLogOut()
  })

  it('user1 logins back and invites user2 and user3 to his group', () => {
    cy.giLogin(`user1-${userId}`)

    cy.giCreateGroup(groupName, { income: 400 })

    cy.getByDT('inviteButton').click()

    cy.getByDT('invitee').within(() => {
      cy.get('input').clear().type(`user2-${userId}`)
      cy.getByDT('add', 'button').click()
      cy.getByDT('feedbackMsg').should('contain', 'Ready to be invited!')
    })

    cy.getByDT('addInviteeSlot').click()

    cy.getByDT('invitee').eq(1).within(() => {
      cy.get('input').clear().type(`user3-${userId}`)
      cy.getByDT('add', 'button').click()
      cy.getByDT('feedbackMsg').should('contain', 'Ready to be invited!')
    })

    cy.log('user1 removes user3 from invitation list and cancels process')
    cy.getByDT('invitee').eq(1).within(() => {
      cy.getByDT('remove').click()
    })
    cy.getByDT('invitee').should('have.length', 1)
    cy.closeModal()

    cy.log('user1 decides to actually invite user2 and user3 to the group')
    cy.giInviteMember([`user2-${userId}`, `user3-${userId}`])
    cy.giLogOut()
  })

  function assertGroupMembersCount (count) {
    // OPTIMIZE: We could also verify the username of each member...
    cy.getByDT('groupMembers').find('ul')
      .children()
      .should('have.length', count)
  }

  it('both user2 and user 3 accept the invitation', () => {
    cy.giLogin(`user2-${userId}`)
    cy.giAcceptGroupInvite(groupName)
    assertGroupMembersCount(2)
    cy.giLogOut()

    cy.giLogin(`user3-${userId}`)
    cy.giAcceptGroupInvite(groupName)
    assertGroupMembersCount(3)
    cy.giLogOut()
  })
})
