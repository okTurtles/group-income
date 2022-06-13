<template lang="pug">
.c-group-members(data-test='groupMembers')
  .c-group-members-header
    h3.is-title-4 {{title}}

    button.button.is-small.is-outlined(
      data-test='inviteButton'
      @click='headerButtonAction'
    )
      i.icon-plus.is-prefix
      i18n(v-if='action === "addMember"') Add
      i18n(v-else) New

  ul.c-group-list
    li.c-group-member(
      v-for='{username, displayName, invitedBy, isNew} in firstTenMembers'
      :data-test='username'
      :class='invitedBy && "is-pending"'
      :key='username'
    )
      profile-card(:username='username')
        avatar(v-if='invitedBy' src='/assets/images/user-avatar-pending.png' size='sm' data-test='openMembersProfileCard')
        avatar-user(v-else :username='username' size='sm' data-test='openMemberProfileCard')

        button.is-unstyled.c-name.has-ellipsis(data-test='username') {{ localizedName(username) }}
        i18n.pill.is-neutral(v-if='invitedBy' data-test='pillPending') pending
        i18n.pill.is-primary(v-else-if='isNew' data-test='pillNew') new

        group-members-tooltip-pending.c-menu(v-if='invitedBy' :username='username')

  i18n.link(
    tag='button'
    v-if='groupMembersCount > 10'
    :args='{ groupMembersCount }'
    @click='openModal("GroupMembersAllModal")'
    data-test='seeAllMembers'
  ) See all {groupMembersCount} members
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import Avatar from '@components/Avatar.vue'
import AvatarUser from '@components/AvatarUser.vue'
import ProfileCard from '@components/ProfileCard.vue'
import GroupMembersTooltipPending from '@containers/dashboard/GroupMembersTooltipPending.vue'
import {
  L
} from '@common/common.js'

export default ({
  name: 'GroupMembers',
  components: {
    Avatar,
    AvatarUser,
    ProfileCard,
    GroupMembersTooltipPending
  },
  props: {
    title: {
      type: String,
      default: L('Members')
    },
    action: {
      type: String,
      default: 'addMember',
      validator: (value) => ['addMember', 'chat'].includes(value)
    }
  },
  computed: {
    ...mapGetters([
      'groupMembersCount',
      'groupMembersSorted',
      'groupShouldPropose',
      'ourUsername',
      'userDisplayName'
    ]),
    firstTenMembers () {
      return this.groupMembersSorted.slice(0, 10)
    }
  },
  methods: {
    invite () {
      this.$router.push({ path: '/invite' })
    },
    openModal (modal, queries) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, queries)
    },
    localizedName (username) {
      const name = this.userDisplayName(username)
      return username === this.ourUsername ? L('{name} (you)', { name }) : name
    },
    headerButtonAction () {
      let modalAction = 'AddMembers'
      if (this.action === 'addMember' && !this.groupShouldPropose) modalAction = 'InvitationLinkModal'
      // Todo create new group modal
      if (this.action === 'chat') modalAction = 'GroupMembersDirectMessages'
      this.openModal(modalAction)
    }
  }
}: Object)
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
  margin-bottom: 0.5rem;
}

.c-group-list {
  margin-bottom: 1.5rem;
}

.c-group-member {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 3rem;
  padding: 0.5rem 1.5rem 0.5rem 1.5rem;
  margin: 0 -0.5rem 0 -1.5rem;

  &:hover {
    background-color: $general_1;
    cursor: pointer;
  }

  > .c-twrapper {
    width: 100%;
  }
}

.c-avatar {
  width: 2rem;
  height: 2rem;
  margin-bottom: 0;
}

.c-name {
  margin-right: 0.5rem;
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
