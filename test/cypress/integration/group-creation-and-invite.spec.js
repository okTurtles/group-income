describe('Group Creation and Inviting Members', () => {
  const userId = new Date().getMilliseconds()

  const group = {
    name: 'Dreamers',
    image: 'imageTest.png',
    values: 'Testing group values',
    income: 200
  }

  it('successfully loads the homepage', function () {
    cy.visit('/')
  })

  it('register user1 and logout', () => {
    cy.giSignUp(`user1-${userId}`)
    cy.giLogOutWithNoGroup()
  })

  it('register user2 and logout', () => {
    cy.giSignUp(`user2-${userId}`)
    cy.giLogOutWithNoGroup()
  })

  it('register user3 and logout', () => {
    cy.giSignUp(`user3-${userId}`)
    cy.giLogOutWithNoGroup()
  })

  it('user1 logins back and creates new Group', () => {
    cy.giLogin(`user1-${userId}`)

    cy.giCreateGroup(group)
    cy.getByDT('profileName').should('contain', `user1-${userId}`)

    cy.getByDT('welcomeGroup').should('contain', `Welcome ${group.name}!`)
  })

  it('user1 starts inviting user2 to the Group', () => {
    cy.getByDT('inviteButton').click()

    cy.getByDT('searchUser').clear().type(`user2-${userId}`)

    cy.getByDT('addButton').click()

    cy.getByDT('member').should('lengthOf', 1)
  })

  it('user1 cancels user2 invitation', () => {
    cy.getByDT('deleteMember').click()

    cy.getByDT('member').should('not.exist')
  })

  it('user1 decides to actually invite user2 and user3 to the group', () => {
    cy.getByDT('searchUser').clear().type(`user2-${userId}`)
    cy.getByDT('addButton').click()

    cy.getByDT('searchUser').clear().type(`user3-${userId}`)
    cy.getByDT('addButton').click()

    cy.getByDT('submit').click()

    cy.getByDT('notifyInvitedSuccess')
      .should('contain', 'Members invited successfully!')

    cy.giLogOut()
  })

  it('user2 accepts the invite', () => {
    cy.giLogin(`user2-${userId}`)
    cy.giAcceptGroupInvite(groupName)
    cy.giLogOut()
  })

  it('user3 accepts the invite', () => {
    cy.giLogin(`user3-${userId}`)
    cy.giAcceptGroupInvite(groupName)
    cy.giLogOut()
  })
})
