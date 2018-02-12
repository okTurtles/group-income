import * as Events from '../../../shared/events'
import backend from './backend'

export const createInviteMail = async function (mailbox, groupName, groupId) {
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

export const createInviteToGroup = async function (inviteHash, memberName, groupId) {
  const latest = await backend.latestHash(groupId)
  const sentDate = new Date().toString()
  // create record of the invitation in the group's contract
  return new Events.HashableGroupRecordInvitation(
    {
      username: memberName,
      inviteHash: inviteHash,
      sentDate
    },
    latest
  )
}
