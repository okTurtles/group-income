describe('Group Creation and Inviting Members', () => {
  const userId = '61'

  const groupName = 'Dreamers'

  it('successfully loads the homepage', function () {
    cy.visit('/')
  })

  it('register 5 users and logout each one', () => {
    for (var i = 1; i <= 5; i++) {
      cy.giSignUp(`user${i}-${userId}`)
      cy.giLogOut()
    }
  })

  it('user1 logins back and creates new Group', () => {
    cy.giLogin(`user1-${userId}`)

    cy.giCreateGroup(groupName, {
      income: 400
    })
    cy.getByDT('profileName').should('contain', `user1-${userId}`)

    cy.getByDT('welcomeGroup').should('contain', `Welcome ${groupName}!`)
  })

  it('user1 invites user2 and user3 to the group', () => {
    cy.getByDT('inviteButton').click()

    cy.getByDT('searchUser').clear().type(`user2-${userId}`)
    cy.getByDT('addButton').click()

    cy.getByDT('searchUser').clear().type(`user3-${userId}`)
    cy.getByDT('addButton').click()

    cy.getByDT('submit').click()

    cy.getByDT('notifyInvitedSuccess')
      .should('contain', 'Members invited successfully!')

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

  it('user1 proposes to invite user4 and user5 to the group', () => {
    cy.giLogin(`user1-${userId}`)
    cy.getByDT('inviteButton').click()

    cy.getByDT('searchUser').clear().type(`user4-${userId}`)
    cy.getByDT('addButton').click()

    cy.getByDT('searchUser').clear().type(`user5-${userId}`)
    cy.getByDT('addButton').click()

    cy.getByDT('submit').click()

    cy.getByDT('notifyInvitedSuccess')
      .should('contain', 'Members proposed successfully!')

    cy.giLogOut()
  })

  it('user2 logins back to see the two proposals', () => {
    cy.giLogin(`user2-${userId}`)
    // ... And now you decide what to do manually!
  })
})
