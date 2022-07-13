const randomDigit = () => Math.floor(Math.random() * 100000)

const users = {
  u1: { name: `u1-${randomDigit()}` },
  u2: { name: `u2-${randomDigit()}` },
  u3: { name: `u3-${randomDigit()}` }
}
const pwCommon = '1234567'
const dreamersGroupName = 'Dreamers'

// utils
const signUpUser = userKey => {
  const { name } = users[userKey]

  cy.giSignup(name, {
    bypassUI: true,
    password: pwCommon
  })
}

const logUserIn = userKey => {
  cy.giLogin(users[userKey].name, { password: pwCommon, bypassUI: true })
}

const inviteUserToDreamersViaLink = (userKey, link) => {
  const { name } = users[userKey]

  cy.giAcceptGroupInvite(link, {
    username: name,
    groupName: dreamersGroupName
  })
}

describe('Sebin - task prep', () => {
  const invitationLinks = {}

  it('sign up "u1" and create "Dreamers" group', () => {
    cy.visit('/').its('sbp').then(sbp => {
      const { loggedIn } = sbp('state/vuex/state')

      expect(loggedIn).to.equal(false)
      signUpUser('u1')

      cy.giCreateGroup(dreamersGroupName, { bypassUI: true })

      cy.giGetInvitationAnyone().then(url => {
        invitationLinks.anyone = url
      })

      cy.giLogout()
    })
  })

  it('signup "u2" and "u3" via "anyone" invitation link', () => {
    if (!invitationLinks.anyone) { return }

    inviteUserToDreamersViaLink('u2', invitationLinks.anyone)
    inviteUserToDreamersViaLink('u3', invitationLinks.anyone)
  })

  it('log "u1" in back again', () => {
    logUserIn('u1')
  })
})
