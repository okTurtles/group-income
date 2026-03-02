<template lang='pug'>
page(
  pageTestName='GlobalDirectMessages'
  pageTestHeaderName='pageHeaderName'
)
  template(#title='') {{ L('Direct Messages') }}

  template(#sidebar='{ toggle }')
    chat-nav
      chat-members.c-dm-list(
        @new='toggle'
        @redirect='toggle'
        :hideNewButton='true'
        :title='L("Conversations")'
        :noItemText='L("No active DMs yet.")'
      )

  .c-page-content-wrapper
    direct-message-chat-interface(v-if='inChatInterfacePage')
    template(v-else)
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
        searchText: ''
      }
    }
  },
  computed: {
    ...mapGetters([
      'allDirectMessagesDetails',
      'ourUnreadMessages'
    ]),
    hasNoActiveDms () {
      return this.sortedDMList.length === 0
    },
    inChatInterfacePage () {
      return this.$route.name === 'GlobalDirectMessagesConversation' &&
        this.$route.params.chatRoomID
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

      // The item with hasNew: true should be at the top of the list regardless of the date.
      sortedList.forEach(dmGroup => {
        dmGroup.items.sort((a, b) => {
          return b.hasNew && !a.hasNew ? 1 : -1
        })
      })

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
  margin: 1.5rem auto 3rem;
  max-width: 42rem;

  @include desktop {
    margin: 1.5rem 0 3rem;
  }
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
    margin-top: 0.75rem;
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
</style>
