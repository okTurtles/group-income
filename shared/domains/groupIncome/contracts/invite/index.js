'use strict'

// =======================
// Domain: Proposals
// =======================

import * as Events from '../../../../events'
import backend from '../../../../../frontend/simple/js/backend'

export default {
  // create the invite record to the users' mailbox contract
  '/mailContract/createPostMessage': async function (mailbox, groupName, groupId, messageType) {
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
  '/groupContract/createInvitation': async function (inviteHash, memberName, groupId) {
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
