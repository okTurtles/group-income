<template lang='pug'>
page(pageTestName='groupChat' pageTestHeaderName='channelName')
  template(#title='')
    .c-header
      i(
        v-if='summary.private !== undefined'
        :class='`icon-${ summary.private ? "lock" : "hashtag" } c-group-i`'
      )
      | {{summary.title}}
      menu-parent(v-if='summary.joined')
        menu-trigger.c-menu-trigger.is-icon-small
          i.icon-angle-down.c-menu-i

        menu-content
          menu-header
            i18n Channel Options

          ul
            menu-item(
              v-if='!summary.general && ourUsername === summary.creator'
              @click='openModal("EditChannelNameModal")'
              data-test='renameChannel'
            )
              i18n Rename
            menu-item(@click='openModal("ChatMembersAllModal")')
              i18n Members
            menu-item(
              :class='`${!summary.general ? "c-separator" : ""}`'
              @click='openModal("UserSettingsModal", {section: "notifications"})'
              data-test='notificationsSettings'
            )
              i18n Notifications settings
            menu-item(
              v-if='!summary.general'
              @click='openModal("LeaveChannelModal")'
              data-test='leaveChannel'
            )
              i18n(:args='{ channelName: summary.title }') Leave {channelName}
            menu-item.has-text-danger(
              v-if='!summary.general && ourUsername === summary.creator'
              @click='openModal("DeleteChannelModal")'
              data-test='deleteChannel'
            )
              i18n Delete channel

  template(#description='')
    .c-header-description
      i18n.is-unstyled.c-link(
        tag='button'
        @click='openModal("ChatMembersAllModal")'
        :args='{ numMembers: members.size  }'
        data-test='channelMembers'
      ) {numMembers} members
      | ∙
      .is-unstyled(
        :class='{"c-link": ourUsername === summary.creator}'
        v-if='summary.description'
        data-test='updateDescription'
        @click='editDescription'
      )
        | {{ summary.description }}
        i.icon-pencil-alt

      i18n.is-unstyled(
        v-else
        :class='{"c-link": ourUsername === summary.creator}'
        data-test='updateDescription'
        @click='editDescription'
      ) Add description

  template(#sidebar='')
    chat-nav(
      :title='L("Chat")'
    )
      conversations-list(
        :title='L("Channels")'
        routepath='/group-chat/'
        :list='channels'
        route-name='GroupChatConversation'
      )

      group-members(:title='L("Direct Messages")' action='chat')

  .card.c-card
    chat-main(
      :summary='summary'
      :details='details'
      :type='type.groups'
    )
</template>

<script>
import { mapGetters } from 'vuex'
import Page from '@components/Page.vue'
import ConversationsList from '@containers/chatroom/ConversationsList.vue'
import ChatNav from '@containers/chatroom/ChatNav.vue'
import ChatMain from '@containers/chatroom/ChatMain.vue'
import chatroom from '@containers/chatroom/chatroom.js'
import GroupMembers from '@containers/dashboard/GroupMembers.vue'
import { OPEN_MODAL } from '@utils/events.js'
import sbp from '@sbp/sbp'
import { MenuParent, MenuTrigger, MenuContent, MenuItem, MenuHeader } from '@components/menu/index.js'
import { CHATROOM_PRIVACY_LEVEL, CHATROOM_TYPES } from '@model/contracts/constants.js'

export default ({
  name: 'GroupChat',
  mixins: [
    chatroom
  ],
  components: {
    Page,
    ChatNav,
    ChatMain,
    ConversationsList,
    GroupMembers,
    MenuParent,
    MenuHeader,
    MenuTrigger,
    MenuContent,
    MenuItem
  },
  computed: {
    ...mapGetters([
      'chatRoomsInDetail',
      'globalProfile',
      'groupProfiles',
      'isJoinedChatRoom',
      'getChatRooms',
      'ourUsername'
    ]),
    getChatRoomIDsInSort () {
      return Object.keys(this.getChatRooms || {}).map(chatRoomID => ({
        name: this.getChatRooms[chatRoomID].name,
        privacyLevel: this.getChatRooms[chatRoomID].privacyLevel,
        joined: this.isJoinedChatRoom(chatRoomID),
        id: chatRoomID
      })).filter(details => details.privacyLevel !== CHATROOM_PRIVACY_LEVEL.PRIVATE || details.joined).sort((former, latter) => {
        const formerName = former.name
        const latterName = latter.name
        if (former.joined === latter.joined) {
          if (formerName > latterName) {
            return 1
          } else if (formerName < latterName) {
            return -1
          }
          return 0
        }
        return former.joined ? -1 : 1
      }).map(chatRoom => chatRoom.id)
    },
    channels () {
      return {
        order: this.getChatRoomIDsInSort,
        channels: this.chatRoomsInDetail
      }
    },
    members () {
      return {
        users: this.details.participants,
        size: this.details.numberOfParticipants
      }
    },
    type () {
      return {
        members: CHATROOM_TYPES.INDIVIDUAL,
        groups: CHATROOM_TYPES.GROUP
      }
    }
  },
  methods: {
    openModal (modal, props) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, props)
    },
    editDescription () {
      if (this.ourUsername === this.summary.creator) {
        this.openModal('EditChannelDescriptionModal')
      }
    }
  },
  watch: {
    '$route' (to: Object, from: Object) {
      const { chatRoomId } = to.params
      this.$nextTick(() => {
        this.refreshTitle()
      })
      if (chatRoomId && chatRoomId !== this.currentChatRoomId) {
        if (!this.isJoinedChatRoom(chatRoomId) && this.isPrivateChatRoom(chatRoomId)) {
          this.redirectChat('GroupChatConversation')
        } else {
          sbp('state/vuex/commit', 'setCurrentChatRoomId', {
            chatRoomId: to.params.chatRoomId
          })
          if (!this.isJoinedChatRoom(chatRoomId)) {
            this.loadSummaryAndDetails()
          }
        }
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-card {
  margin-top: -1.5rem;
  padding: 0;
  height: 100%;

  @include tablet {
    margin-top: 1.5rem;
    height: auto;
  }

  &:last-child {
    margin-bottom: 2rem;
  }
}

::v-deep .c-logo {
  @include touch {
    display: none;
  }
}

.c-header {
  text-transform: capitalize;
  display: flex;
  align-items: center;

  .c-group-i {
    margin-right: 0.5rem;
    color: $text_1;
    font-size: 1rem;
  }

  .c-menu {
    margin-left: 0.5rem;
  }

  .c-header {
    font-size: 0.75rem;
    font-weight: 400;
    color: $text_1;
    padding-bottom: 0;
    @include tablet {
      padding-top: 0;
    }
  }

  .c-content {
    min-width: 17.5rem;
    font-size: 0.875rem;
    font-weight: 400;

    @extend %floating-panel;

    @include desktop {
      left: -6.8rem;
    }
  }

  .c-menu-i {
    font-size: 1.2rem;
    transform-origin: 50% 48%;
  }

  .c-separator {
    border-bottom: 2px solid $general_2;
  }

  .c-menuItem ::v-deep .c-item-link {
    @extend %floating-panel-item;
  }
}

.has-text-danger ::v-deep .c-item-slot {
  color: $danger_0;
}

.c-link {
  color: $text_0;
  border-color: $text_0;
  cursor: pointer;
  font-family: inherit;

  &:hover {
    text-decoration: underline;

    .icon-pencil-alt {
      opacity: 1;
      margin-left: 0.2rem;
    }
  }
}

.icon-pencil-alt {
  opacity: 0;
  margin-left: 0.2rem;
  transition: opacity 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.c-header-description {
  display: none;

  @include desktop {
    display: flex;
  }

  .is-unstyled {
    margin: 0 0.2rem;
  }
}

.c-menu-trigger.is-active {
  pointer-events: none;

  .c-menu-i {
    transform: rotate(180deg);
  }
}
</style>
