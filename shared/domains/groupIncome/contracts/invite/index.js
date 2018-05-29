'use strict'

// =======================
// Domain: Proposals
// =======================

import * as Events from '../../../../events'
// TODO: this should be accessed via an SBP call, not via an import
import backend from '../../../../../frontend/simple/controller/backend'

export default {
  // create the invite record to the users' mailbox contract
  'groupIncome.contracts/mailContract/createPostMessage': async function (
    mailbox: string,
    groupName: string,
    groupId: string,
    messageType: string
  ) {
    const latestMailbox = await backend.latestHash(mailbox)
    const sentDate = new Date().toString()
    return new Events.HashableMailboxPostMessage(
      {
        from: groupName,
        headers: [groupId],
        messageType: Events.HashableMailboxPostMessage[messageType],
        sentDate
      },
      latestMailbox
    )
  },
  // create record of the invitation in the group's contract
  'groupIncome.contracts/groupContract/createInvitation': async function (
    inviteHash: string,
    memberName: string,
    groupId: string
  ) {
    const latestGroup = await backend.latestHash(groupId)
    const sentDate = new Date().toString()
    return new Events.HashableGroupRecordInvitation(
      {
        username: memberName,
        inviteHash: inviteHash,
        sentDate
      },
      latestGroup
    )
  }
}
