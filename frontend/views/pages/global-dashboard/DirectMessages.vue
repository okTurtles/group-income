<template lang='pug'>
page(
  pageTestName='GlobalDirectMessages'
  pageTestHeaderName='pageHeaderName'
  :miniHeader='inChatInterfacePage'
  :class='{ "is-in-chat-interface": inChatInterfacePage }'
)
  template(v-if='!inChatInterfacePage' #title='') {{ L('Direct Messages') }}
  template(v-else #header='')
    .c-dm-header
      .avatar-wrapper(v-if='summary.picture')
        avatar(
          :src='summary.picture'
          alt='Partner Picture'
          size='sm'
        )
      i(v-else class='icon-hashtag header-group-icon')
      h1.is-title-2.p-title {{ summary.title }}
      menu-parent.c-menu-parent
        menu-trigger.c-menu-trigger.is-icon-small
          i.icon-angle-down.menu-arrow-icon

        menu-content.c-responsive-menu
          menu-header
            i18n Channel Options

          menu
            menu-item.hide-desktop(v-if='pinnedMessages.length')
              i18n(@click='showPinnedMessages') Pinned Messages
            menu-item(
              @click='openModal("ChatNotificationSettingsModal")'
              data-test='notificationsSettings'
            )
              i18n Notification settings
            menu-item.has-text-primary(
              v-if='inChatInterfacePage'
              @click='backToDMlist'
            )
              i18n Conversations list

  template(#description='')
    .c-pinned-messages-description(v-if='pinnedMessages.length')
      span.header-pin-wrapper(
        data-test='numberOfPinnedMessages'
        @click='showPinnedMessages'
      )
        i.icon-thumbtack
        i18n(:args='{ messagesCount: pinnedMessages.length }') {messagesCount} Pinned

  template(#sidebar='{ toggle }')
    chat-nav
      .c-back-btn-container(v-if='inChatInterfacePage')
        button.link.c-back-btn(@click.stop='backToDMlist(toggle)')
          i.icon-angle-left.c-back-icon
          i18n Conversations list

      chat-members.c-dm-list(
        @new='toggle'
        @redirect='toggle'
        :hideNewButton='true'
        :title='L("Conversations")'
        :noItemText='L("No active DMs yet.")'
      )

  .c-page-content-wrapper(:class='{ "is-in-dm-list": !inChatInterfacePage }')
    direct-message-chat-interface(
      v-if='inChatInterfacePage'
      ref='chatInterface'
      @chatroom-summary-change='onChatroomSummaryChange'
    )
    .c-dm-main-container(v-else)
      .card.c-search-container
        .inputgroup
          .is-icon.prefix(aria-hidden='true')
            i.icon-search
          input.input(
            type='text'
            name='search'
            :placeholder='L("Find a DM")'
            v-model='ephemeral.searchText'
          )

      .c-no-active-dms-container(v-if='hasNoActiveDms')
        i.icon-comment-dots.c-check-icon
        i18n.has-text-1 No active DMs yet.

      template(v-else)
        .c-no-search-results(v-if='filteredDMList.length === 0')
          i18n.has-text-1(
            :args='{ searchText: ephemeral.searchText, ...LTags("b") }'
          ) No DMs found for "{b_}{searchText}{_b}".
        template(v-else)
          .c-dm-group(
            v-for='dmGroup in filteredDMList'
            :key='dmGroup.dateDisplay'
          )
            .c-group-date.is-title-4 {{ dmGroup.dateDisplay }}

            .c-dm-list-items
              direct-message-list-item(
                v-for='dm in dmGroup.items'
                :key='dm.chatRoomID'
                :dmDetails='dm'
            )

  pinned-messages(
    v-if='inChatInterfacePage'
    ref='pinnedMessages'
    @unpin-message='unpinMessage'
    @scroll-to-pinned-message='scrollToPinnedMessage'
  )
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import Page from '@components/Page.vue'
import ChatNav from '@containers/chatroom/ChatNav.vue'
import ChatMembers from '@containers/chatroom/ChatMembers.vue'
import Avatar from '@components/Avatar.vue'
import { L } from '@common/common.js'
import { MESSAGE_TYPES } from '@model/contracts/shared/constants.js'
import { OPEN_MODAL } from '@utils/events.js'
import { humanDate } from '@model/contracts/shared/time.js'
import { stripMarkdownSyntax } from '@view-utils/markdown-utils.js'
import DirectMessageListItem from '@containers/global-dashboard/DirectMessageListItem.vue'
import DirectMessageChatInterface from '@containers/global-dashboard/DirectMessageChatInterface.vue'
import PinnedMessages from '@containers/chatroom/PinnedMessages.vue'
import { MenuParent, MenuTrigger, MenuContent, MenuItem, MenuHeader } from '@components/menu/index.js'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

export default {
  name: 'DirectMessages',
  components: {
    Page,
    ChatNav,
    ChatMembers,
    DirectMessageListItem,
    DirectMessageChatInterface,
    Avatar,
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem,
    MenuHeader,
    PinnedMessages
  },
  data () {
    return {
      ephemeral: {
        searchText: '',
        chatroomSummary: null
      }
    }
  },
  computed: {
    ...mapGetters([
      'allDirectMessagesDetails',
      'ourUnreadMessages',
      'currentChatRoomId',
      'isJoinedChatRoom',
      'chatRoomPinnedMessages'
    ]),
    summary () {
      return this.ephemeral.chatroomSummary || {}
    },
    inChatInterfacePage () {
      return this.$route.name === 'GlobalDirectMessagesConversation' &&
        Boolean(this.$route.params.chatRoomID)
    },
    pinnedMessages () {
      if (this.inChatInterfacePage) {
        const { chatRoomID } = this.summary
        if (chatRoomID &&
          this.isJoinedChatRoom(chatRoomID) &&
          chatRoomID === this.currentChatRoomId) {
          return this.chatRoomPinnedMessages
        }
      }

      return []
    },
    hasNoActiveDms () {
      return this.sortedDMList.length === 0
    },
    sortedDMList () {
      const sortedList = []
      const allDmEntries = Object.entries(this.allDirectMessagesDetails).sort((a, b) => {
        // In case DM has no messages yet, use the chatroom creation date for sorting
        const aTimeStamp = a[1].lastMsgTimeStamp || a[1].createdTimeStamp
        const bTimeStamp = b[1].lastMsgTimeStamp || b[1].createdTimeStamp
        return bTimeStamp - aTimeStamp
      })

      for (const [chatRoomID, directMessageDetails] of allDmEntries) {
        const { lastMsgTimeStamp, createdTimeStamp } = directMessageDetails
        const dateDisplay = humanDate(lastMsgTimeStamp || createdTimeStamp, { month: 'long', day: 'numeric', year: 'numeric' })
        let listEntry = sortedList.find(entry => entry.dateDisplay === dateDisplay)

        if (!listEntry) {
          listEntry = {
            dateDisplay,
            items: []
          }
          sortedList.push(listEntry)
        }

        listEntry.items.push({
          chatRoomID,
          ...directMessageDetails,
          previewMessage: this.getChatroomMessagePreview(chatRoomID),
          hasNew: this.chatroomHasNewMessages(chatRoomID)
        })
      }

      return sortedList
    },
    filteredDMList () {
      const searchText = this.ephemeral.searchText.toLowerCase()
      const containsSearchText = (str) => {
        return typeof str === 'string' && str.toLowerCase().includes(searchText)
      }

      return this.sortedDMList.map(dmGroup => {
        return {
          ...dmGroup,
          items: dmGroup.items.filter(dm => {
            return containsSearchText(dm.title) ||
              dm.partners.some(partner => containsSearchText(partner.username) ||
              containsSearchText(partner.displayName))
          })
        }
      }).filter(dmGroup => dmGroup.items.length > 0)
    }
  },
  methods: {
    getChatroomMessagePreview (chatRoomID) {
      const chatroomState = this.$store.state[chatRoomID]

      if (chatroomState?.messages?.length > 0) {
        const latestMsg = chatroomState.messages[chatroomState.messages.length - 1]
        const from = latestMsg.from

        switch (latestMsg.type) {
          case MESSAGE_TYPES.TEXT: {
            const text = latestMsg.text ? stripMarkdownSyntax(latestMsg.text) : ''
            const hasAttachments = latestMsg.attachments?.length > 0

            if (!text && hasAttachments) {
              // If the message only has attachments.
              return {
                previewType: 'info',
                text: L('Sent attachments.'),
                from
              }
            }

            // Use 100 characters of the text at most for the preview.
            // Also, If the text contains a new line in the middle of it, split the text by \n and add an ellipsis.
            const shouldHaveTrailingEllipsis = text.length > 100 || /\n+(?=.*\S)/.test(text)
            return {
              previewType: 'text',
              text: `${text.slice(0, 100).split('\n')[0]}${shouldHaveTrailingEllipsis ? '...' : ''}`,
              from
            }
          }
          case MESSAGE_TYPES.POLL: {
            const pollTitle = latestMsg.pollData.question
            return {
              previewType: 'info',
              text: L('Created a poll "{pollTitle}".', { pollTitle }),
              from
            }
          }
          default:
            return {
              previewType: 'info',
              text: L('New message added.'),
              from
            }
        }
      }

      return null
    },
    onChatroomSummaryChange (chatroomSummary) {
      this.ephemeral.chatroomSummary = chatroomSummary
    },
    chatroomHasNewMessages (chatRoomID) {
      const unReadMessagesEntry = this.ourUnreadMessages[chatRoomID]
      return unReadMessagesEntry
        ? unReadMessagesEntry.unreadMessages?.length > 0
        : false
    },
    showPinnedMessages (event) {
      const rect = event.target.parentNode.getBoundingClientRect()
      if (this.$refs.pinnedMessages) {
        this.$refs.pinnedMessages.open({
          left: `${rect.left - 3.2}px`,
          top: `${rect.bottom + 8}px` // 8 -> 0.5rem gap
        }, this.pinnedMessages)
      }
    },
    unpinMessage (messageHash) {
      if (this.$refs.chatInterface) {
        this.$refs.chatInterface.unpinMessage(messageHash)
      }
    },
    scrollToPinnedMessage (messageHash) {
      if (this.$refs.chatInterface) {
        this.$refs.chatInterface.scrollToPinnedMessage(messageHash)
      }
    },
    openModal (modal, props) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, props)
    },
    backToDMlist (postAction = null) {
      this.$router.push({ name: 'GlobalDirectMessages' }).catch(logExceptNavigationDuplicated)

      postAction && postAction()
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
@import "@assets/style/components/_chat_mixins.scss";

.c-page-content-wrapper {
  height: 100%;

  @include from ($tablet) {
    height: calc(100% - 1.5rem);
  }

  &.is-in-dm-list {
    margin: 1.5rem auto 3rem;
    max-width: 42rem;
    height: auto;

    @include from ($tablet) {
      height: auto;
    }

    @include desktop {
      margin: 1.5rem 0 3rem;
    }
  }
}

.c-dm-main-container {
  position: relative;
  width: 100%;
}

.c-no-active-dms-container {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  row-gap: 0.25rem;
  margin-top: 3rem;

  .c-check-icon {
    font-size: 2.75rem;
    color: $text_1;
    line-height: 1.25;
  }

  @include tablet {
    margin-top: 4rem;

    .c-check-icon {
      font-size: 3.25rem;
    }
  }
}

.c-search-container {
  padding: 1rem 1.5rem;

  &:has(+ .c-dm-group) {
    margin-bottom: 3rem;
  }
}

.c-no-search-results {
  padding-left: 0.25rem;
  margin-top: 1.5rem;
}

.c-group-date {
  margin-bottom: 1rem;
}

.c-dm-group {
  margin-bottom: 3rem;

  &:first-of-type {
    margin-top: 3rem;
  }
}

.c-dm-header {
  @include chat-header-styles;

  @include desktop {
    margin-bottom: 0.5rem;
  }
}

.c-pinned-messages-description {
  @include header-description-styles;
}

.c-menuItem ::v-deep .c-item-link {
  @extend %floating-panel-item;
}

.c-menu-trigger.is-active {
  pointer-events: none;

  .menu-arrow-icon {
    transform: rotate(180deg);
  }
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

.c-back-btn-container {
  margin-bottom: 1.25rem;

  @include desktop {
    margin-top: 2rem;
  }
}

.c-dm-list {
  @include desktop {
    margin-top: 0.75rem;

    .c-back-btn-container + & {
      margin-top: 1.5rem;
    }
  }
}

.c-back-btn {
  border-bottom: none;
  font-weight: 400;

  .c-back-icon {
    display: inline-block;
    margin-right: 0.375rem;
  }
}

// deep descendants styles

.has-text-primary ::v-deep .c-item-slot {
  color: $primary_0;
}

.is-in-chat-interface ::v-deep .p-main {
  @include p-main-custom-styles;
}
</style>
