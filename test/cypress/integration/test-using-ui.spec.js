const userId = Math.floor(Math.random() * 10000)

describe('Test Signup - using UI', () => {
  it('signups 10 users', () => {
    cy.visit('/')

    for (var i = 1; i <= 10; i++) {
      cy.giSignup(`user${i}-${userId}`)
      cy.giLogout({ hasNoGroup: true })
    }
  })
})
