<template lang="pug">
.c-group-members(data-test='groupMembers')
  .c-group-members-header
    i18n.is-title-4(tag='h3') Members

    button.button.is-small.is-outlined(
      data-test='inviteButton'
      @click='openModal(groupShouldPropose ? "AddMembers" : "InvitationLinkModal")'
    )
      i.icon-plus.is-prefix
      i18n Add

  ul.c-group-list
    li.c-group-member(
      v-for='(member, username) in firstTenMembers'
      :class='member.isPending && "is-pending"'
      :key='username'
    )
      avatar(v-if='member.isPending' size='sm')
      avatar-user(v-else :username='username' size='sm')

      .c-name.has-ellipsis(data-test='username')
        | {{ userDisplayName(username) }} &nbsp;
        i18n(v-if='username === ourUsername') (you)

      i18n.pill.is-neutral(v-if='member.isPending' data-test='pillPending') pending
      i18n.pill.is-success(v-else-if='username !== ourUsername && isNewMember(username)' data-test='pillNew') new

      tooltip(
        v-if='member.isPending'
        direction='bottom-end'
      )
        span.button.is-icon-small(
          data-test='pendingTooltip'
        )
          i.icon-question-circle
        template(slot='tooltip')
          i18n(
            tag='p'
            :args='{ invitedBy: `${member.invitedBy} ${member.invitedBy === ourUsername ? `(${L("you")})` : ""}` }'
          ) This member did not use their invite link to join the group yet. This link should be given to them by {inviter}

      group-member-menu(v-else :username='username')
  i18n.link(
    tag='button'
    v-if='groupMembersCount > 10'
    :args='{ groupMembersCount }'
    @click='openModal("GroupMembersAllModal")'
    data-test='seeAllMembers'
  ) See all {groupMembersCount} members
</template>

<script>
import { mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'
import Avatar from '@components/Avatar.vue'
import AvatarUser from '@components/AvatarUser.vue'
import GroupMemberMenu from '@containers/dashboard/GroupMemberMenu.vue'
import Tooltip from '@components/Tooltip.vue'
import { INVITE_INITIAL_CREATOR, INVITE_STATUS } from '@model/contracts/group.js'
export default {
  name: 'GroupMembers',
  components: {
    Avatar,
    AvatarUser,
    GroupMemberMenu,
    Tooltip
  },
  computed: {
    ...mapGetters([
      'groupProfiles',
      'groupShouldPropose',
      'groupMembersCount',
      'ourUsername',
      'userDisplayName',
      'currentGroupState'
    ]),
    dateNow () {
      console.log('calculate dateNow')
      return Date.now()
    },
    pendingMembers () {
      const invites = this.currentGroupState.invites

      return Object.keys(invites)
        .filter(id => invites[id].status === INVITE_STATUS.VALID && invites[id].creator !== INVITE_INITIAL_CREATOR)
        .reduce((acc, id) => {
          acc[invites[id].invitee] = {
            isPending: true,
            invitedBy: invites[id].creator
          }
          return acc
        }, {})
    },
    firstTenMembers () {
      const profiles = this.groupProfiles
      const sliceIndex = 10 - Math.min(10, Object.keys(this.pendingMembers).length) // avoid slicing too many members.
      const usernames = Object.keys(profiles).slice(0, sliceIndex)
      const members = usernames.reduce((acc, username) => {
        // Prevent displaying users without a synced contract.
        // It happens at the exact moment a user joins a group and both
        // contracts (group + user) are still syncing
        const profile = profiles[username]
        if (profile) {
          acc[username] = profile
        }
        return acc
      }, {})

      return { ...this.pendingMembers, ...members }
    }
  },
  methods: {
    invite () {
      this.$router.push({ path: '/invite' })
    },
    openModal (modal, queries) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, queries)
    },
    isNewMember (username) {
      const weJoined = this.currentGroupState.profiles[this.ourUsername].joined_ms
      const memberJoined = this.currentGroupState.profiles[username].joined_ms
      const joinedAfterUs = weJoined < memberJoined
      return joinedAfterUs && this.dateNow - memberJoined < 604800000 // joined less than 1w (168h) ago.
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-group-members {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  position: relative;
}

.c-group-members-header {
  display: flex;
  justify-content: space-between;
  align-items: end;
}

.c-group-list {
  margin-bottom: $spacer-md + $spacer-sm;
}

.c-group-member {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: $spacer-lg;
  margin-top: 1rem;
}

.c-avatar {
  width: $spacer-lg;
  height: $spacer-lg;
  margin-bottom: 0;
}

.c-name {
  margin-right: auto;
  margin-left: $spacer-sm;

  .is-pending & {
    color: $text_1;
  }
}

.c-actions-content.c-content {
  top: calc(100% + #{$spacer-sm});
  left: auto;
  min-width: 13rem;
}

</style>
