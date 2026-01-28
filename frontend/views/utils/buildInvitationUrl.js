import sbp from '@sbp/sbp'

export function buildInvitationUrl (groupId: string, groupName: string, inviteSecret: string, creatorID?: string): string {
  const rootGetters = sbp('state/vuex/getters')
  const creatorUsername = creatorID && rootGetters.usernameFromID(creatorID)
  return `${sbp('okTurtles.data/get', 'API_URL')}/app/join#?${(new URLSearchParams({
        groupId: groupId,
        groupName: groupName,
        secret: inviteSecret,
        ...(creatorID && {
          creatorID,
          ...(creatorUsername && {
            creatorUsername
          })
        })
      })).toString()}`
}
