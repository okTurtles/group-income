<template lang='pug'>
page(pageTestName='groupChat' :miniHeader='isGroupDirectMessage()')
  template(#header='')
    .c-channel-header(data-test='channelName')
      .avatar-wrapper(v-if='summary.picture')
        avatar(
          :src='summary.picture'
          alt='Partner Picture'
          size='sm'
        )
      i(v-else :class='`icon-${ summary.isPrivate ? "lock" : "hashtag" } c-group-i`')
      h1.is-title-2.p-title {{summary.title}}
      menu-parent.c-menu-parent
        menu-trigger.c-menu-trigger.is-icon-small
          i.icon-angle-down.c-menu-i

        menu-content.c-responsive-menu
          menu-header
            i18n Channel Options

          menu
            menu-item(
              v-if='!summary.isGeneral && isChatRoomCreator && !isGroupDirectMessage()'
              @click='openModal("EditChannelNameModal")'
              data-test='renameChannel'
            )
              i18n Rename

            menu-item(
              v-if='isChatRoomCreator && !isGroupDirectMessage()'
              @click='editDescription'
              data-test='updateDescription'
            )
              i18n(v-if='!summary.attributes.description') Add description
              i18n(v-else) Update description

            template(v-if='!isGroupDirectMessageToMyself()')
              menu-item(v-if='!isGroupDirectMessage()' @click='openModal("ChatMembersAllModal")')
                i18n Members
              menu-item(v-else @click='openModal("ChatMembersAllModal")' data-test='addPeople')
                i18n Add People

            template(v-if='summary.isJoined')
              menu-item.hide-desktop(v-if='pinnedMessages.length')
                i18n(@click='showPinnedMessages($event)') Pinned Messages

              menu-item(
                :class='`${!summary.isGeneral && !isGroupDirectMessage() ? "c-separator" : ""}`'
                @click='openModal("ChatNotificationSettingsModal")'
                data-test='notificationsSettings'
              )
                i18n Notification settings

              menu-item(
                v-if='!summary.isGeneral && !isGroupDirectMessage()'
                @click='openModal("LeaveChannelModal")'
                data-test='leaveChannel'
              )
                i18n(:args='{ channelName: summary.title }') Leave {channelName}

            menu-item.has-text-danger(
              v-if='canDeleteChatRoom'
              @click='openModal("DeleteChannelModal")'
              data-test='deleteChannel'
            )
              i18n Delete channel

  template(#description='')
    .c-channel-header-description
      span.c-pin-wrapper(
        data-test='numberOfPinnedMessages'
        v-if='pinnedMessages.length'
        @click='showPinnedMessages($event)'
      )
        i.icon-thumbtack
        i18n(:args='{ messagesCount: pinnedMessages.length }') {messagesCount} Pinned
      template(v-if='!isGroupDirectMessage()')
        span(v-if='pinnedMessages.length') ∙
        button.is-unstyled.c-link(
          type='button'
          @click='openModal("ChatMembersAllModal")'
          data-test='channelMembers'
        )
          i18n(v-if='summary.numberOfMembers === 1') 1 member
          i18n(v-else :args='{ num: summary.numberOfMembers }') {num} members

        template(v-if='summary.attributes.description || isChatRoomCreator')
          | ∙
          .is-unstyled(
            v-if='summary.attributes.description'
            :class='{"c-link": isChatRoomCreator}'
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
    chat-main(ref='chatMain' :summary='summary')

  pinned-messages(
    ref='pinnedMessages'
    @unpin-message='unpinMessage'
    @scroll-to-pinned-message='scrollToPinnedMessage'
  )
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import Avatar from '@components/Avatar.vue'
import Page from '@components/Page.vue'
import ConversationsList from '@containers/chatroom/ConversationsList.vue'
import ChatNav from '@containers/chatroom/ChatNav.vue'
import ChatMain from '@containers/chatroom/ChatMain.vue'
import ChatMixin from '@containers/chatroom/ChatMixin.js'
import ChatMembers from '@containers/chatroom/ChatMembers.vue'
import PinnedMessages from '@containers/chatroom/PinnedMessages.vue'
import { OPEN_MODAL } from '@utils/events.js'
import { MenuParent, MenuTrigger, MenuContent, MenuItem, MenuHeader } from '@components/menu/index.js'
import { CHATROOM_PRIVACY_LEVEL } from '@model/contracts/shared/constants.js'
import { L } from '@common/common.js'

export default ({
  name: 'GroupChat',
  mixins: [
    ChatMixin
  ],
  components: {
    Avatar,
    Page,
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
      'groupIdFromChatRoomId',
      'isJoinedChatRoom',
      'groupChatRooms',
      'chatRoomPinnedMessages',
      'ourGroupPermissionsHas',
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
    },
    isChatRoomCreator () {
      return this.ourIdentityContractId === this.summary.attributes.creatorID
    },
    canDeleteChatRoom () {
      // TODO: add DELETE_CHANNEL permission related check here when it's implemented
      const hasPermission = this.isChatRoomCreator || this.isJoinedChatRoom(this.summary.chatRoomID)
      return !this.summary.isGeneral && hasPermission && !this.isGroupDirectMessage()
    }
  },
  methods: {
    openModal (modal, props) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, props)
    },
    showPinnedMessages (event) {
      const element = event.target.parentNode.getBoundingClientRect()
      this.$refs.pinnedMessages.open({
        left: `${element.left - 3.2}px`, // 3.2 -> 0.2rem of description element padding
        top: `${element.bottom + 8}px` // 8 -> 0.5rem gap
      }, this.pinnedMessages)
    },
    editDescription () {
      this.openModal('EditChannelDescriptionModal')
    },
    unpinMessage (messageHash) {
      if (this.$refs.chatMain) {
        this.$refs.chatMain.unpinFromChannel(messageHash)
      }
    },
    scrollToPinnedMessage (messageHash) {
      if (this.$refs.chatMain) {
        this.$refs.chatMain.scrollToMessage(messageHash)
      }
    },
    hasPermissionToReadChatRoom (chatRoomID) {
      if (this.isJoinedChatRoom(chatRoomID)) {
        return true
      }

      const groupId = this.groupIdFromChatRoomId(chatRoomID)
      if (groupId && this.$store.state[groupId].chatRooms[chatRoomID].privacyLevel !== CHATROOM_PRIVACY_LEVEL.PRIVATE) {
        return true
      }

      return false
    }
  },
  watch: {
    '$route' (to: Object, from: Object) {
      this.$nextTick(() => {
        this.refreshTitle()
      })
      const { chatRoomID } = to.params
      const { mhash } = to.query
      const prevChatRoomId = from.params.chatRoomID || ''
      if (chatRoomID) {
        if (chatRoomID !== prevChatRoomId) {
          if (!this.isJoinedChatRoom(chatRoomID)) {
            if (this.hasPermissionToReadChatRoom(chatRoomID)) {
              this.updateCurrentChatRoomID(chatRoomID)
              this.loadLatestState(chatRoomID)
            } else {
              alert(L('Sorry, this message is from a private chatroom that you are not part of.'))
              this.$router.go(-1)
            }
          } else {
            this.updateCurrentChatRoomID(chatRoomID)
          }
        } else if (mhash) {
          // NOTE: this block handles the behavior to scroll to the message with mhash
          //       when user clicks the message link of the one from current chatroom
          this.$refs.chatMain?.scrollToMessage(mhash).then(() => {
            // NOTE: delete mhash from queries after scroll to and highlight it
            const newQuery = { ...to.query }
            delete newQuery.mhash
            this.$router.replace({ query: newQuery })
          })
        }
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-card {
  padding: 0;
  height: calc(100% - 1.5rem);
  margin-bottom: 1.5rem;
  border-radius: 0.625rem;

  @include phone {
    height: 100%;
    margin: 0 -1rem 0 -1rem;
    border-radius: 0.625rem 0.625rem 0 0;
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

    @include touch {
      padding-top: 0 !important;
    }
  }
}

.c-channel-header {
  display: flex;
  align-items: center;
  position: relative;

  @include touch {
    width: 100%;
    justify-content: center;
  }

  .p-title {
    display: block;
    width: fit-content;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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

.c-channel-header-description {
  display: none;

  @include desktop {
    display: flex;
    margin-bottom: 0.5rem;
  }

  .is-unstyled {
    margin: 0 0.2rem;
  }

  .c-pin-wrapper {
    cursor: pointer;

    span {
      margin-left: 0.25rem;
      margin-right: 0.2rem;
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
  flex: 0 0 2.5rem;
}

.c-menu-parent.c-menu {
  @include tablet {
    position: unset;

    .c-responsive-menu {
      top: 2.5rem;
      transform: translateX(-50%);
      left: 50%;
    }
  }

  @include desktop {
    .c-responsive-menu {
      left: 0;
      right: auto;
      transform: unset;
    }
  }
}
</style>
