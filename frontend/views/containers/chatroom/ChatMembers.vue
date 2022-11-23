<template lang="pug">
.c-group-members(data-test='chatMembers')
  .c-group-members-header
    h3.is-title-4 {{title}}

    button.button.is-small.is-outlined(
      data-test='inviteButton'
      @click='headerButtonAction'
    )
      i.icon-plus.is-prefix
      i18n New

  ul.c-group-list
    list-item(
      v-for='{username, displayName, picture} in directMessages'
      tag='router-link'
      :to='buildUrl(username)'
      :data-test='username'
      :key='username'
    )
      .profile-wrapper
        profile-card(:username='username' deactivated)
          avatar-user(:username='username' :picture='picture' size='sm' data-test='openMemberProfileCard')
          span.is-unstyled.c-name.has-ellipsis(data-test='username') {{ localizedName(username, displayName) }}

      .c-unreadcount-wrapper
        .pill.is-danger(
          v-if='getUnreadMessagesCountFromUsername(username)'
        ) {{limitedUnreadCount(getUnreadMessagesCountFromUsername(username))}}

    list-item(
      v-for='{contractID, title, othersCount, picture} in groupMessages'
      tag='router-link'
      :to='buildUrl(contractID, false)'
      :data-test='contractID'
      :key='contractID'
    )
      .picture-wrapper
        avatar(
          :src='picture'
          :alt='title'
          size='xs'
        )
        .c-badge {{ othersCount }}
      span.is-unstyled.c-name.has-ellipsis(data-test='title') {{ title }}
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import Avatar from '@components/Avatar.vue'
import AvatarUser from '@components/AvatarUser.vue'
import ProfileCard from '@components/ProfileCard.vue'
import GroupMembersTooltipPending from '@containers/dashboard/GroupMembersTooltipPending.vue'
import ListItem from '@components/ListItem.vue'
import { L } from '@common/common.js'

export default ({
  name: 'GroupMembers',
  components: {
    Avatar,
    AvatarUser,
    ProfileCard,
    GroupMembersTooltipPending,
    ListItem
  },
  props: {
    title: {
      type: String,
      default: L('Members')
    },
    action: {
      type: String,
      default: 'addDirectMessage',
      validator: (value) => ['addDirectMessage'].includes(value)
    }
  },
  computed: {
    ...mapGetters([
      'groupMembersCount',
      'ourContactProfiles',
      'groupShouldPropose',
      'ourUsername',
      'userDisplayName',
      'ourDirectMessages',
      'ourGroupMessages',
      'chatRoomUnreadMentions',
      'directMessageIDFromUsername',
      'groupMessageInfo'
    ]),
    directMessages () {
      return Object.keys(this.ourDirectMessages)
        .filter(username => this.ourDirectMessages[username].joinedDate)
        .map(username => this.ourContactProfiles[username])
    },
    groupMessages () {
      return Object.keys(this.ourGroupMessages)
        .filter(contractID => this.$store.state.contracts[contractID] &&
          Object.keys(this.$store.state[contractID]?.users || {}).length > 1 // NOTE: this is when contract is syncing
        )
        .map(contractID => this.groupMessageInfo(contractID))
    }
  },
  methods: {
    invite () {
      this.$router.push({ path: '/invite' })
    },
    openModal (modal, queries) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, queries)
    },
    localizedName (username, displayName) {
      const name = displayName || this.userDisplayName(username)
      return username === this.ourUsername ? L('{name} (you)', { name }) : name
    },
    buildUrl (username, isPrivacyLevelPrivate = true) {
      const chatRoomId = isPrivacyLevelPrivate ? this.directMessageIDFromUsername(username) : username
      return {
        name: 'GroupChatConversation',
        params: { chatRoomId }
      }
    },
    headerButtonAction () {
      let modalAction = ''
      if (this.action === 'addDirectMessage') modalAction = 'NewDirectMessageModal'
      if (modalAction) {
        this.openModal(modalAction)
      }
    },
    getUnreadMessagesCountFromUsername (username) {
      const chatRoomId = this.directMessageIDFromUsername(username)
      return this.chatRoomUnreadMentions(chatRoomId).length
    },
    limitedUnreadCount (n) {
      const nLimit = 99
      if (n > nLimit) {
        return `${nLimit}+`
      } else {
        return `${n}`
      }
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
}

.c-menu {
  margin-left: 0.5rem;
}

.c-actions-content.c-content {
  top: calc(100% + 0.5rem);
  left: auto;
  min-width: 13rem;
}

.c-unreadcount-wrapper {
  width: 2rem;
  display: flex;
  justify-content: center;
}

.profile-wrapper {
  flex: auto;
  width: 100px;
}

.picture-wrapper {
  position: relative;
}

.c-badge {
  position: absolute;
  bottom: -0.25rem;
  right: 0;
  border-radius: 0.5rem;
  background-color: $general_0;
  color: $text_0;
  width: 1rem;
  height: 1rem;
  font-size: 0.75rem;
}
</style>
