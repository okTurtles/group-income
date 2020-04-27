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
      :data-test='username'
      :class='member.invitedBy && "is-pending"'
      :key='username'
    )
      profile-card(:username='username' :isSelf='username === ourUsername')
        avatar(v-if='member.invitedBy' size='sm')
        avatar-user(v-else :username='username' size='sm')

        button.is-unstyled.c-name.has-ellipsis(data-test='username') {{ localizedName(username) }}

      i18n.pill.is-neutral(v-if='member.invitedBy' data-test='pillPending') pending
      i18n.pill.is-primary(v-else-if='isNewMember(username)' data-test='pillNew') new

      group-members-tooltip-pending.c-menu(v-if='member.invitedBy' :username='username')
      group-members-menu.c-menu(v-else :username='username')

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
import GroupMembersMenu from '@containers/dashboard/GroupMembersMenu.vue'
import ProfileCard from '@components/ProfileCard.vue'
import GroupMembersTooltipPending from '@containers/dashboard/GroupMembersTooltipPending.vue'
import L from '@view-utils/translations.js'

export default {
  name: 'GroupMembers',
  components: {
    Avatar,
    AvatarUser,
    GroupMembersMenu,
    ProfileCard,
    GroupMembersTooltipPending
  },
  computed: {
    ...mapGetters([
      'groupProfiles',
      'groupShouldPropose',
      'groupMembersCount',
      'ourUsername',
      'userDisplayName',
      'currentGroupState',
      'groupMembersPending'
    ]),
    weJoinedMs () {
      return new Date(this.currentGroupState.profiles[this.ourUsername].joinedDate).getTime()
    },
    firstTenMembers () {
      const profiles = this.groupProfiles
      const sliceIndex = 10 - Math.min(10, Object.keys(this.groupMembersPending).length) // avoid slicing too many members.
      const usernames = Object.keys(profiles).slice(0, sliceIndex)
      const members = usernames.reduce((acc, username) => {
        // Prevent displaying users without a synced contract.
        // It happens at the exact moment a user joins a group and both
        // contracts (group + user) are still syncing
        const profile = profiles[username]
        if (profile) {
          acc[username] = { profile }
        }
        return acc
      }, {})

      // TODO - Sort members #869
      return { ...this.groupMembersPending, ...members }
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
      if (username === this.ourUsername) { return false }

      const memberJoinedMs = new Date(this.currentGroupState.profiles[username].joinedDate).getTime()
      const joinedAfterUs = this.weJoinedMs < memberJoinedMs
      return joinedAfterUs && Date.now() - memberJoinedMs < 604800000 // joined less than 1w (168h) ago.
    },
    localizedName (username) {
      const name = this.userDisplayName(username)
      return username === this.ourUsername ? L('{name} (you)', { name }) : name
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
  align-items: center;
}

.c-group-list {
  margin-bottom: 1.5rem;
}

.c-group-member {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 2rem;
  margin-top: 1rem;
}

.c-avatar {
  width: 2rem;
  height: 2rem;
  margin-bottom: 0;
}

.c-name {
  margin-right: auto;
  margin-left: 0.5rem;
  font-family: inherit;
  border-bottom: 1px solid transparent;

  &:hover,
  &:focus {
    border-bottom-color: $text_0;
  }
}

.c-menu {
  margin-left: 0.5rem;
}

.c-actions-content.c-content {
  top: calc(100% + 0.5rem);
  left: auto;
  min-width: 13rem;
}

</style>
