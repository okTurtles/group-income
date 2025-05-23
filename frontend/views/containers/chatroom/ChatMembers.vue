<template lang="pug">
.c-group-members(data-test='chatMembers')
  .c-group-members-header
    h3.is-title-4 {{title}}

    button.button.is-small.is-outlined(
      data-test='inviteButton'
      @click='onClickNewDirectMessage'
    )
      i.icon-plus.is-prefix
      i18n New

  ul.c-group-list
    list-item(
      v-for='({ partners, title, picture, isDMToMyself }, chatRoomID) in ourGroupDirectMessages'
      tag='router-link'
      :to='buildUrl(chatRoomID)'
      :data-test='chatRoomID'
      :key='chatRoomID'
      @click='$emit("redirect")'
    )
      .profile-wrapper(v-if='isDMToMyself')
        profile-card(:contractID='ourIdentityContractId' deactivated)
          avatar-user(:contractID='ourIdentityContractId' :picture='picture' size='sm' data-test='openMemberProfileCard')
          span.is-unstyled.c-name.has-ellipsis(
            :class='{ "has-text-bold": shouldStyleBold(chatRoomID) }'
            :data-test='title'
          )
            span {{ title }}
            i18n.c-you (you)

      template(v-else)
        .profile-wrapper(v-if='partners.length === 1')
          profile-card(:contractID='partners[0].contractID' deactivated)
            avatar-user(:contractID='partners[0].contractID' :picture='picture' size='sm' data-test='openMemberProfileCard')
            span.is-unstyled.c-name.has-ellipsis(
              :class='{ "has-text-bold": shouldStyleBold(chatRoomID) }'
              :data-test='partners[0].username'
            ) {{ title }}

        .group-wrapper(v-else)
          .picture-wrapper
            avatar(:src='picture' :alt='title' size='xs')
            .c-badge {{ partners.length }}
          span.is-unstyled.c-name.has-ellipsis(
            :data-test='title'
            :class='{ "has-text-bold": shouldStyleBold(chatRoomID) }'
          ) {{ title }}

      .c-unreadcount-wrapper
        .pill.is-danger(
          v-if='getUnreadMsgCount(chatRoomID)'
        ) {{ limitedUnreadCount(getUnreadMsgCount(chatRoomID)) }}
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
  name: 'ChatMembers',
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
      default: L('Direct Messages')
    },
    action: {
      type: String,
      default: 'addDirectMessage',
      validator: (value) => ['addDirectMessage'].includes(value)
    }
  },
  computed: {
    ...mapGetters([
      'groupShouldPropose',
      'ourGroupDirectMessages',
      'ourIdentityContractId',
      'chatRoomUnreadMessages',
      'isChatRoomManuallyMarkedUnread'
    ])
  },
  methods: {
    invite () {
      this.$router.push({ path: '/invite' })
    },
    openModal (modal, queries) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, queries)
    },
    buildUrl (chatRoomID) {
      return {
        name: 'GroupChatConversation',
        params: { chatRoomID }
      }
    },
    onClickNewDirectMessage () {
      let modalAction = ''
      if (this.action === 'addDirectMessage') modalAction = 'NewDirectMessageModal'
      if (modalAction) {
        this.openModal(modalAction)
        this.$emit('new')
      }
    },
    getUnreadMsgCount (chatRoomID) {
      return this.chatRoomUnreadMessages(chatRoomID).length
    },
    shouldStyleBold (chatRoomID) {
      return this.isChatRoomManuallyMarkedUnread(chatRoomID) ||
        this.getUnreadMsgCount(chatRoomID) > 0
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

.c-you {
  display: inline-block;
  margin-left: 0.25rem;
  font-size: 0.875em;
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

.group-wrapper {
  display: flex;
  flex: auto;
  width: 100px;
}

.picture-wrapper {
  position: relative;
  min-width: 2rem;
  margin-right: 0.5rem;
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
