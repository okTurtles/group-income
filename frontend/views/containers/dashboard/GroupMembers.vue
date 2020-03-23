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
      :class='member.pending && "is-pending"'
      :key='username'
    )
      avatar-user(:username='username' size='sm')

      .c-name.has-ellipsis(data-test='username')
        | {{ username }}

      i18n.pill.has-text-small.has-background-dark(
        v-if='member.pending'
        data-test='pending'
      ) pending

      tooltip(
        v-if='member.pending'
        direction='bottom-end'
      )
        span.button.is-icon-small(
          data-test='pendingTooltip'
        )
          i.icon-question-circle
        template(slot='tooltip')
          i18n(
            tag='p'
            :args='{ username }'
          ) We are waiting for {username} to join the group by using their unique invite link.

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
import AvatarUser from '@components/AvatarUser.vue'
import GroupMemberMenu from '@containers/dashboard/GroupMemberMenu.vue'
import Tooltip from '@components/Tooltip.vue'

export default {
  name: 'GroupMembers',
  components: {
    AvatarUser,
    GroupMemberMenu,
    Tooltip
  },
  methods: {
    invite () {
      this.$router.push({ path: '/invite' })
    },
    openModal (modal, queries) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, queries)
    }
  },
  computed: {
    ...mapGetters([
      'groupProfiles',
      'groupShouldPropose',
      'groupMembersCount',
      'ourUsername'
    ]),
    firstTenMembers () {
      const profiles = this.groupProfiles
      const usernames = Object.keys(profiles).slice(0, 10)
      return usernames.reduce((acc, username) => {
        // Prevent displaying users without a synced contract.
        // It happens at the exact moment a user joins a group and both
        // contracts (group + user) are still syncing
        const profile = profiles[username]
        if (profile) {
          acc[username] = profile
        }
        return acc
      }, {})
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

  .is-pending & {
    color: $text_1;
  }
}

.c-actions-content.c-content {
  top: calc(100% + 0.5rem);
  left: auto;
  min-width: 214px;
}

</style>
