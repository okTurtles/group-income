<template lang='pug'>
page(
  pageTestName='GlobalDirectMessages'
  pageTestHeaderName='pageHeaderName'
  :miniHeader='inChatInterfacePage'
  :class='{ "is-in-chat-interface": inChatInterfacePage }'
)
  template(#title='') {{ pageTitle }}

  template(#sidebar='{ toggle }')
    template(v-if='isDevelopmentMode')
      chat-nav
        chat-members.c-dm-list(
          @new='toggle'
          @redirect='toggle'
          :hideNewButton='true'
          :title='L("Conversations")'
          :noItemText='L("No active DMs yet.")'
        )

  template(v-if='isDevelopmentMode')
    .c-page-content-wrapper(:class='{ "is-in-dm-list": !inChatInterfacePage }')
      transition(:name='transitionName' mode='out-in')
        direct-message-chat-interface(
          v-if='inChatInterfacePage'
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
  template(v-else)
    i18n.has-text-1 Direct Messages: Coming soon!
</template>

<script>
import { mapGetters } from 'vuex'
import Page from '@components/Page.vue'
import ChatNav from '@containers/chatroom/ChatNav.vue'
import ChatMembers from '@containers/chatroom/ChatMembers.vue'
import { L } from '@common/common.js'
import { MESSAGE_TYPES } from '@model/contracts/shared/constants.js'
import { humanDate } from '@model/contracts/shared/time.js'
import { stripMarkdownSyntax } from '@view-utils/markdown-utils.js'
import DirectMessageListItem from '@containers/global-dashboard/DirectMessageListItem.vue'
import DirectMessageChatInterface from '@containers/global-dashboard/DirectMessageChatInterface.vue'

export default {
  name: 'DirectMessages',
  components: {
    Page,
    ChatNav,
    ChatMembers,
    DirectMessageListItem,
    DirectMessageChatInterface
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
      'ourUnreadMessages'
    ]),
    inChatInterfacePage () {
      return this.$route.name === 'GlobalDirectMessagesConversation' &&
        this.$route.params.chatRoomID
    },
    pageTitle () {
      const defaultTitle = L('Direct Messages')
      return this.inChatInterfacePage ? this.ephemeral.chatroomSummary?.title : defaultTitle
    },
    isDevelopmentMode () {
      return process.env.NODE_ENV === 'development'
    },
    hasNoActiveDms () {
      return this.sortedDMList.length === 0
    },
    transitionName () {
      return this.inChatInterfacePage ? 'in-right-out-left' : 'in-left-out-right'
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
        return str.toLowerCase().includes(searchText)
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
            const text = stripMarkdownSyntax(latestMsg.text)
            const hasAttachments = latestMsg.attachments?.length > 0

            if (!text && hasAttachments) {
              // If the message only has attachments.
              return {
                previewType: 'info',
                text: L('Sent a message with attachments.'),
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
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

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

.c-dm-list {
  @include desktop {
    margin-top: 1.5rem;
  }
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

.is-in-chat-interface ::v-deep {
  .p-main {
    height: auto !important;
    // removing width constraints only for group-chat page to take advantage of big monitors to display more of the chat (refer to: https://github.com/okTurtles/group-income/issues/1623)
    max-width: unset !important;

    @include touch {
      padding-top: 0 !important;
    }
  }
}
</style>
