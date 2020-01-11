const userId = Math.floor(Math.random() * 10000)

describe('Test Signup - bypass UI', () => {
  it('signups 10 users', () => {
    cy.visit('/')

    for (var i = 1; i <= 10; i++) {
      const username = `user${i}-${userId}`
      cy.visit(`/app/bypass-ui?action=signup&username=${username}&email=user1%40email.com`)
      cy.giLogout({ hasNoGroup: true })
    }
  })
})
