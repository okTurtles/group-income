/*
* This file contains the invariant functions to be used as transaction steps
* Rules:
* 1. Create a new version of a function if you have to modify it after its initial pull request has been acccepted
* 2. Update the version constant when modifying
* 3. Each call must update at most one contract, at most one time
* 4. Make internal functionality as atomic as possible
 */
export const publishLogEntry = 'publishLogEntryV1'
export async function publishLogEntryV1 ({backend, contractId, entry}) {
  await backend.publishLogEntry(contractId, entry)
}
export const namespaceRegister = 'namespaceRegisterV1'
export async function namespaceRegisterV1 ({namespace, name, value}) {
  await namespace.register(name, value)
}

export const backendSubscribe = 'backendSubscribeV1'
export async function backendSubscribeV1 ({backend, contractId}) {
  await backend.subscribe(contractId)
}

export const identitySetAttribute = 'identitySetAttributeV1'
export async function identitySetAttributeV1 ({backend, Events, contractId, name, value}) {
  let latestHash = await backend.latestHash(contractId)
  let attribute = new Events.HashableIdentitySetAttribute({attribute: {name, value}}, latestHash)
  await backend.publishLogEntry(contractId, attribute)
}

export const saveGroupProfile = 'saveGroupProfileV1'
export async function saveGroupProfileV1 ({backend, Events, contractId, username, profile}) {
  let latestHash = await backend.latestHash(contractId)
  let profileEntry = new Events.HashableGroupSetGroupProfile(
    {
      username: username,
      json: JSON.stringify(profile)
    },
    latestHash
  )
  await backend.publishLogEntry(contractId, profileEntry)
}

export const sendMail = 'sendMailV1'
export async function sendMailV1 ({backend, Events, contractId, date, from, message}) {
  let latestHash = await backend.latestHash(contractId)
  let mail = new Events.HashableMailboxPostMessage({
    sentDate: date,
    messageType: Events.HashableMailboxPostMessage.TypeMessage,
    from: from,
    message: message
  }, latestHash)
  await backend.publishLogEntry(contractId, mail)
}
export const acceptInvite = 'acceptInviteV1'
export async function acceptInviteV1 ({backend, Events, contractId, username, identityContractId, inviteHash, acceptanceDate}) {
  let latestHash = await backend.latestHash(contractId)
  let acceptance = new Events.HashableGroupAcceptInvitation(
    {
      username,
      identityContractId,
      inviteHash,
      acceptanceDate
    },
    latestHash
  )
  r
  await backend.publishLogEntry(contractId, acceptance)
}
export const declineInvite = 'declineInviteV1'
export async function declineInviteV1 ({backend, Events, contractId, username, inviteHash, declinedDate}) {
  let latestHash = await backend.latestHash(contractId)
  let declination = new Events.HashableGroupDeclineInvitation(
    {
      username,
      inviteHash,
      declinedDate
    },
    latestHash
  )
  await backend.publishLogEntry(contractId, declination)
}

export const postInvite = 'postInviteV1'
export async function postInviteV1 ({backend, Events, mailboxId, sentDate, groupName, groupId}) {
  let latestHash = await backend.latestHash(mailboxId)

  // We need to post the invite to the users' mailbox contract
  const invite = new Events.HashableMailboxPostMessage(
    {
      from: groupName,
      headers: [groupId],
      messageType: Events.HashableMailboxPostMessage.TypeInvite,
      sentDate
    },
    latestHash
  )
  this.setInScope('lastInviteHash', invite.toHash())
  await backend.publishLogEntry(mailboxId, invite)
}

export const recordInvite = 'recordInviteV1'
export async function recordInviteV1 ({backend, Events, groupId, username, inviteHash, sentDate}) {
  let latestHash = await backend.latestHash(groupId)
  const invited = new Events.HashableGroupRecordInvitation(
    {
      username,
      inviteHash,
      sentDate
    },
    latestHash
  )
  await backend.publishLogEntry(groupId, invited)
}

export const sendGroupProposal = 'sendGroupProposalV1'
export async function sendGroupProposalV1 ({backend, Events, proposal, percentage, candidate, transaction,
  initiator, initiationDate, groupId}) {
  let latestHash = await backend.latestHash(groupId)

  const proposition = new Events.HashableGroupProposal({
    proposal,
    percentage,
    candidate,
    transaction,
    initiator,
    initiationDate
  }, latestHash)
  await backend.publishLogEntry(groupId, proposition)
}

export const voteForProposal = 'voteForProposalV1'
export async function voteForProposalV1 ({backend, Events, username, proposalHash, groupId}) {
  let latestHash = await backend.latestHash(groupId)

  let vote = new Events.HashableGroupVoteForProposal({ username, proposalHash }, latestHash)
  await backend.publishLogEntry(groupId, vote)
}

export const voteAgainstProposal = 'voteAgainstProposalV1'
export async function voteAgainstProposalV1 ({backend, Events, username, proposalHash, groupId}) {
  let latestHash = await backend.latestHash(groupId)

  let vote = new Events.HashableGroupVoteAgainstProposal({ username, proposalHash }, latestHash)
  await backend.publishLogEntry(groupId, vote)
}
