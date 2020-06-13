// [*note_1*] Don't use bypassUI here because this user is syncing the contract
// and the last action (removeMember sideEffect) redirects them to / (home)
// causing the bypassUI to fail in the middle (because it changed pages)

describe('Group - Removing a member', () => {
  const userId = Math.floor(Math.random() * 10000)
  const groupNameA = 'Dreamers'
  const groupNameB = 'Donuts'

  const invitationLinks = []

  function assertMembersCount (count) {
    cy.getByDT('groupMembers').find('ul>li').should('have.length', count)
  }

  function openRemoveMemberModal (username, nth) {
    cy.getByDT('groupMembers').find(`ul>li:nth-child(${nth})`).within(() => {
      cy.getByDT('username').should('contain', `${username}-${userId}`)

      cy.getByDT('openMemberProfileCard').click()
    })

    cy.getByDT('memberProfileCard').within(() => {
      cy.getByDT('buttonRemoveMember')
        .should('contain', 'Remove member')
        .click()
    })
  }

  function removeMemberNow (username) {
    assertMembersCount(2)
    cy.getByDT('modalProposal').within(() => {
      cy.getByDT('description').should('contain', `Are you sure you want to remove ${username}-${userId} from the group?`)
      cy.getByDT('submitBtn').click()
    })
    cy.getByDT('closeModal').should('not.exist')
    assertMembersCount(1)
  }

  // ------- Remove member that has only 1 group.

  it('user1 creates a groupA', () => {
    cy.visit('/')
    cy.giSignup(`user1-${userId}`, { bypassUI: true })

    cy.giCreateGroup(groupNameA, { bypassUI: true })

    cy.giGetInvitationAnyone().then(url => {
      invitationLinks.anyone_groupA = url
    })

    cy.giLogout()
  })

  it('user2 joins groupA and cannot remove user1', () => {
    cy.giAcceptGroupInvite(invitationLinks.anyone_groupA, {
      username: `user2-${userId}`,
      groupName: groupNameA,
      bypassUI: true,
      actionBeforeLogout: () => {
        cy.log('Option to Remove Member does not exist')
        cy.getByDT('groupMembers').find('ul>li:nth-child(1)').within(() => {
          cy.getByDT('username').should('contain', `user1-${userId}`)
          cy.getByDT('openMemberProfileCard').click()
        })
        cy.getByDT('memberProfileCard').find('button').should('have.length', 2) // Send message and close
        cy.getByDT('closeProfileCard').click()
      }
    })
  })

  it('user1 removes user2 from groupA', () => {
    cy.giLogin(`user1-${userId}`)

    openRemoveMemberModal('user2', 1)
    removeMemberNow('user2')
    cy.giLogout()

    // verify user2 (removed) has no group now.
    cy.giLogin(`user2-${userId}`) // [*note_1*]
    cy.getByDT('welcomeHomeLoggedIn').should('contain', 'Let’s get this party started')
  })

  it('user2 rejoins groupA', () => {
    // Wait for contracts to sync before visiting invitationLink. TODO avoid .wait().
    cy.wait(500); // eslint-disable-line
    cy.giAcceptGroupInvite(invitationLinks.anyone_groupA, {
      username: `user2-${userId}`,
      groupName: groupNameA,
      isLoggedIn: true,
      shouldLogoutAfter: false
      // TODO not working. error: [CRITICAL ERROR] NOT EXPECTING EVENT!'
      // bypassUI: true,
    })
    assertMembersCount(2)
  })

  // ------- Remove member that has a second group.

  it('user2 creates a groupB', () => {
    cy.giCreateGroup(groupNameB, { bypassUI: true })

    cy.giGetInvitationAnyone().then(url => {
      invitationLinks.anyone_groupB = url
    })
  })

  it('user1 joins groupB - has now 2 groups', () => {
    cy.giSwitchUser(`user1-${userId}`)

    cy.giAcceptGroupInvite(invitationLinks.anyone_groupB, {
      username: `user1-${userId}`,
      groupName: groupNameB,
      isLoggedIn: true,
      bypassUI: true
    })
  })

  it('user2 removes user1 from groupB - user1 is left with groupA.', () => {
    cy.giLogin(`user2-${userId}`)

    openRemoveMemberModal('user1', 1)
    removeMemberNow('user1')
    cy.giLogout()

    // verify user1 (removed) still has group1.
    cy.giLogin(`user1-${userId}`) // [*note_1*]
    cy.getByDT('groupName').should('contain', groupNameA)

    cy.giLogout()
  })

  // ------- Propose to remove member from group.

  it('userBot joins groupA', () => {
    cy.giAcceptGroupInvite(invitationLinks.anyone_groupA, {
      username: `userBot-${userId}`,
      groupName: groupNameB,
      bypassUI: true
    })
  })

  it('user1 proposes to remove userBot', () => {
    cy.giLogin(`user1-${userId}`, { bypassUI: true })

    openRemoveMemberModal('userBot', 2)

    cy.getByDT('modalProposal').within(() => {
      cy.getByDT('description').should('contain', `Remove userBot-${userId} from the group`)
      cy.getByDT('nextBtn').click()
      cy.getByDT('reason', 'textarea').clear().type('I think it is a bot!')
      cy.getByDT('submitBtn').click()
      cy.getByDT('finishBtn').click()
      cy.getByDT('closeModal').should('not.exist')
    })

    cy.getByDT('proposalsWidget', 'ul').find('li').within(() => {
      cy.getByDT('typeDescription').should('contain', `Remove userBot-${userId} from the group.`)
      cy.getByDT('statusDescription').should('contain', '1 out of 2 members voted.') // 1 out of 2 - the 3rd member can't vote.
    })
  })

  it('userBot cannot vote in this proposal', () => {
    cy.giSwitchUser(`userBot-${userId}`)

    cy.getByDT('proposalsWidget', 'ul').find('li').within(() => {
      cy.getByDT('typeDescription').should('contain', `Remove userBot-${userId} (you) from the group.`)
      // There are no buttons to vote.
      cy.get('button').should('not.exist')
    })
  })

  it('user2 votes "yes". Proposal is accepted and userBot removed', () => {
    cy.giSwitchUser(`user2-${userId}`)

    // Change from groupB to groupA dashboard
    cy.getByDT('groupsList').find('li:nth-child(1) button').click()

    cy.getByDT('proposalsWidget', 'ul').find('li').within(() => {
      cy.getByDT('typeDescription').should('contain', `Remove userBot-${userId} from the group.`)
      cy.getByDT('voteFor').click()
      cy.getByDT('statusDescription')
        .should('contain', 'Proposal accepted!')
    })

    // Verify the group has 2 members only again
    assertMembersCount(2)

    // Verify user1 only sees 2 members too
    cy.giSwitchUser(`user1-${userId}`)
    assertMembersCount(2)
    cy.giLogout()

    // Verify userBot has no group now
    cy.giLogin(`userBot-${userId}`) // [*note_1*]
    cy.getByDT('welcomeHomeLoggedIn').should('contain', 'Let’s get this party started')

    cy.giLogout({ hasNoGroup: true })
  })

  // ------- A member leaves the group.

  it('user2 leaves the groupA - is left with groupB', () => {
    cy.giLogin(`user2-${userId}`, { bypassUI: true })

    cy.getByDT('groupSettingsLink').click()
    cy.getByDT('leaveModalBtn').click()

    cy.getByDT('leaveGroup', 'form').within(() => {
      cy.log('Fill the form incorrectly...')
      cy.getByDT('username').type('u3')
      cy.getByDT('password').type('123456789')
      cy.getByDT('confirmation').type('LEAVE X')

      cy.log('Assert the errors...')
      cy.getByDT('usernameError').should('contain', 'Your username is different')
      cy.getByDT('confirmationError').should('contain', 'Does not match')
      cy.getByDT('btnSubmit').should('have.attr', 'disabled', 'disabled')

      cy.log('Fix the errors and submit')
      cy.getByDT('username').clear().type(`user2-${userId}`)
      cy.getByDT('confirmation').clear().type(`LEAVE ${groupNameA.toUpperCase()}`)

      cy.getByDT('btnSubmit').click()
    })

    cy.getByDT('closeModal').should('not.exist')

    // User2 is part of only one group now.
    cy.getByDT('groupName').should('contain', groupNameB)
  })

  it('user2 rejoins the groupA', () => {
    // Wait for contracts to sync before visiting invitationLink. TODO avoid .wait().
    cy.wait(500); // eslint-disable-line
    cy.giAcceptGroupInvite(invitationLinks.anyone_groupA, {
      username: `user2-${userId}`,
      groupName: groupNameA,
      isLoggedIn: true,
      shouldLogoutAfter: false
    })
    assertMembersCount(2)
  })

  it('user1 removes user2 from groupA', () => {
    // this covers edge case scenario described at #944
    cy.giSwitchUser(`user1-${userId}`)

    openRemoveMemberModal('user2', 1)
    removeMemberNow('user2')
    cy.giLogout()
  })
})
