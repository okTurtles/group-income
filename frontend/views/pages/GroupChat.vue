<template lang='pug'>
page(pageTestName='groupChat' :miniHeader='isDirectMessage()')
  template(#header='')
    .c-header(data-test='channelName')
      .avatar-wrapper(v-if='summary.picture')
        avatar(
          :src='summary.picture'
          alt='Partner Picture'
          size='sm'
        )
      i(v-else :class='`icon-${ summary.isPrivate ? "lock" : "hashtag" } c-group-i`')
      h1.is-title-2.p-title {{summary.title}}
      menu-parent.c-menu-parent(v-if='summary.isJoined')
        menu-trigger.c-menu-trigger.is-icon-small
          i.icon-angle-down.c-menu-i

        menu-content.c-responsive-menu
          menu-header
            i18n Channel Options

          ul
            menu-item(
              v-if='!summary.isGeneral && ourIdentityContractId === summary.attributes.creatorID && !isDirectMessage()'
              @click='openModal("EditChannelNameModal")'
              data-test='renameChannel'
            )
              i18n Rename
            menu-item(
              v-if='ourIdentityContractId === summary.attributes.creatorID && !isDirectMessage()'
              @click='editDescription'
              data-test='updateDescription'
            )
              i18n(v-if='!summary.attributes.description') Add description
              i18n(v-else) Update description
            menu-item(v-if='!isDirectMessage()' @click='openModal("ChatMembersAllModal")')
              i18n Members
            menu-item(v-else @click='openModal("ChatMembersAllModal")' data-test='addPeople')
              i18n Add People
            menu-item(
              :class='`${!summary.isGeneral && !isDirectMessage() ? "c-separator" : ""}`'
              @click='openModal("ChatNotificationSettingsModal")'
              data-test='notificationsSettings'
            )
              i18n Notification settings
            menu-item(
              v-if='!summary.isGeneral && !isDirectMessage()'
              @click='openModal("LeaveChannelModal")'
              data-test='leaveChannel'
            )
              i18n(:args='{ channelName: summary.title }') Leave {channelName}
            menu-item.has-text-danger(
              v-if='!summary.isGeneral && ourIdentityContractId === summary.attributes.creatorID && !isDirectMessage()'
              @click='openModal("DeleteChannelModal")'
              data-test='deleteChannel'
            )
              i18n Delete channel

  template(#description='' v-if='!isDirectMessage()')
    .c-header-description
      i18n.is-unstyled.c-link(
        tag='button'
        @click='openModal("ChatMembersAllModal")'
        :args='{ numMembers: summary.numberOfMembers  }'
        data-test='channelMembers'
      ) {numMembers} members
      template(
        v-if='summary.attributes.description || ourIdentityContractId === summary.attributes.creatorID'
      )
        | ∙
        .is-unstyled(
          v-if='summary.attributes.description'
          :class='{"c-link": ourIdentityContractId === summary.attributes.creatorID}'
          data-test='updateDescription'
          @click='editDescription'
        )
          | {{ summary.attributes.description }}
          i.icon-pencil-alt

        i18n.is-unstyled.c-link(
          v-else
          data-test='updateDescription'
          @click='editDescription'
        ) Add description
    .c-header-shortcuts
      tooltip(
        v-if='pinnedMessages.length'
        :manual='true'
        :opacity='1'
        direction='bottom-left'
      )
        span.c-pin-wrapper
          i.icon-thumbtack
          i18n(:args='{ messagesCount: pinnedMessages.length }') {messagesCount} Pinned
        template(slot='tooltip')
          pinned-messages(:messages='pinnedMessages')

  template(#sidebar='{ toggle }')
    chat-nav
      conversations-list(
        routepath='/group-chat/'
        :list='channels'
        route-name='GroupChatConversation'
        @new='toggle'
        @redirect='toggle'
      )

      chat-members(
        action='addDirectMessage'
        @new='toggle'
        @redirect='toggle'
      )

  .card.c-card
    chat-main(:summary='summary')
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import Avatar from '@components/Avatar.vue'
import Page from '@components/Page.vue'
import Tooltip from '@components/Tooltip.vue'
import ConversationsList from '@containers/chatroom/ConversationsList.vue'
import ChatNav from '@containers/chatroom/ChatNav.vue'
import ChatMain from '@containers/chatroom/ChatMain.vue'
import ChatMixin from '@containers/chatroom/ChatMixin.js'
import ChatMembers from '@containers/chatroom/ChatMembers.vue'
import PinnedMessages from '@containers/chatroom/PinnedMessages.vue'
import { OPEN_MODAL } from '@utils/events.js'
import { MenuParent, MenuTrigger, MenuContent, MenuItem, MenuHeader } from '@components/menu/index.js'
import { CHATROOM_PRIVACY_LEVEL } from '@model/contracts/shared/constants.js'

export default ({
  name: 'GroupChat',
  mixins: [
    ChatMixin
  ],
  components: {
    Avatar,
    Page,
    Tooltip,
    ChatNav,
    ChatMain,
    ConversationsList,
    ChatMembers,
    PinnedMessages,
    MenuParent,
    MenuHeader,
    MenuTrigger,
    MenuContent,
    MenuItem
  },
  computed: {
    ...mapGetters([
      'currentChatRoomId',
      'chatRoomsInDetail',
      'globalProfile',
      'groupProfiles',
      'isJoinedChatRoom',
      'groupChatRooms',
      'chatRoomPinnedMessages',
      'ourIdentityContractId'
    ]),
    getChatRoomIDsInSort () {
      return Object.keys(this.groupChatRooms || {}).map(cID => ({
        name: this.groupChatRooms[cID].name,
        privacyLevel: this.groupChatRooms[cID].privacyLevel,
        joined: this.isJoinedChatRoom(cID),
        id: cID
      })).filter(attr => attr.privacyLevel !== CHATROOM_PRIVACY_LEVEL.PRIVATE || attr.joined).sort((former, latter) => {
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
    pinnedMessages () {
      const { chatRoomID } = this.summary
      if (this.isJoinedChatRoom(chatRoomID) && chatRoomID === this.currentChatRoomId) {
        return this.chatRoomPinnedMessages
      }
      return []
    }
  },
  methods: {
    openModal (modal, props) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, props)
    },
    editDescription () {
      this.openModal('EditChannelDescriptionModal')
    }
  },
  watch: {
    '$route' (to: Object, from: Object) {
      this.$nextTick(() => {
        this.refreshTitle()
      })
      const { chatRoomID } = to.params
      const prevChatRoomId = from.params.chatRoomID || ''
      if (chatRoomID && chatRoomID !== prevChatRoomId) {
        this.updateCurrentChatRoomID(chatRoomID)
        // NOTE: No need to consider not-joined private chatroom because it's impossible
        if (!this.isJoinedChatRoom(chatRoomID)) {
          this.loadLatestState(chatRoomID)
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
  margin-bottom: 0;
  border-radius: 0.625rem;

  @include tablet {
    height: calc(100% - 1.625rem);
    margin-top: 0.125rem;
    margin-bottom: 1rem;
  }

  @include phone {
    margin: -1.5rem -1rem 0 -1rem;
    height: calc(100% + 1.5rem);
    border-radius: 0.625rem 0.625rem 0 0;
  }

  &:last-child {
    margin-bottom: 1.5rem;
  }
}

::v-deep {
  .c-logo {
    @include touch {
      display: none;
    }
  }

  .p-main {
    height: auto !important;
    // removing width constraints only for group-chat page to take advantage of big monitors to display more of the chat (refer to: https://github.com/okTurtles/group-income/issues/1623)
    max-width: unset !important;
  }
}

.c-header {
  display: flex;
  align-items: center;
  position: relative;

  .p-title {
    display: block;
    width: fit-content;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @include touch {
      max-width: 55vw;
    }
  }

  .c-group-i {
    margin-right: 0.5rem;
    color: $text_1;
    font-size: 1rem;
  }

  .c-menu {
    margin-left: 0.5rem;
    margin-right: 0.5rem;
  }

  .c-header {
    font-size: $size_5;
    font-weight: 400;
    color: $text_1;
    padding-bottom: 0;

    @include tablet {
      padding-top: 0;
    }
  }

  .c-content {
    min-width: 17.5rem;
    font-size: $size_4;
    font-weight: 400;

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
    margin-bottom: 0.5rem;
  }

  .is-unstyled {
    margin: 0 0.2rem;
  }
}

.c-header-shortcuts {
  display: none;
  padding: 0 0.2rem;

  @include desktop {
    display: block;
    margin-top: -0.375rem;
  }

  .c-pin-wrapper {
    span {
      margin-left: 0.25rem;
    }
  }
}

.c-menu-trigger.is-active {
  pointer-events: none;

  .c-menu-i {
    transform: rotate(180deg);
  }
}

.avatar-wrapper {
  margin-right: 0.5rem;
}

.c-menu-parent.c-menu {
  @include tablet {
    position: unset;

    .c-responsive-menu {
      left: 0;
      right: auto;
      top: 2.5rem;
    }
  }
}
</style>
