import { CHATROOM_GENERAL_NAME } from '../../../frontend/model/contracts/shared/constants.js'
import { randomUserSuffix } from '../support/lib.js'

const groupName = 'Dreamers'
const user1 = `user1${randomUserSuffix()}`
const user2 = `user2${randomUserSuffix()}`
let me

describe('Check basic markdown features - one feature per message', () => {
  it('user1 creates a group and invites user2', () => {
    let invitationLinkAnyone

    cy.visit('/')
    cy.giSignup(user1, { bypassUI: true })
    me = user1
    cy.giCreateGroup(groupName, { bypassUI: true })
    cy.giGetInvitationAnyone().then(url => {
      invitationLinkAnyone = url

      cy.giRedirectToGroupChat()
      cy.giCheckIfJoinedChatroom(CHATROOM_GENERAL_NAME, me)
      cy.giLogout()

      cy.giAcceptGroupInvite(invitationLinkAnyone, {
        username: user2,
        existingMemberUsername: me,
        groupName,
        bypassUI: true
      })

      cy.giLogout()
    })
  })
})
