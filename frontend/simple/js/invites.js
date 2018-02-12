import * as Events from '../../../shared/events'
import backend from './backend'

export const createInviteMail = async function (mailbox, groupName, groupId) {
  // the latest mailbox attribute for the user
  const latestMailbox = await backend.latestHash(mailbox)
  const sentDate = new Date().toString()
  // create the invite record to the users' mailbox contract
  return new Events.HashableMailboxPostMessage(
    {
      from: groupName,
      headers: [groupId],
      messageType: Events.HashableMailboxPostMessage.TypeInvite,
      sentDate
    },
    latestMailbox
  )
}

export const publishInviteMail = function (mailbox, invite) {
  return backend.publishLogEntry(mailbox, invite)
}

export const createInviteToGroup = async function (inviteHash, memberName, groupId) {
  // create record of the invitation in the group's contract
  const latest = await backend.latestHash(groupId)
  const sentDate = new Date().toString()

  return new Events.HashableGroupRecordInvitation(
    {
      username: memberName,
      inviteHash: inviteHash,
      sentDate
    },
    latest
  )
}

export const publishInviteToGroup = function (groupId, invite) {
  return backend.publishLogEntry(groupId, invite)
}
