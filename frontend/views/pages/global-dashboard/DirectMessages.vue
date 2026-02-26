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
      )

  .c-page-content-wrapper
    direct-message-chat-interface(v-if='showChatInterface')
    template(v-else)
      .card.c-search-container
        .inputgroup
          .is-icon.prefix(aria-hidden='true')
            i.icon-search
          input.input(
            type='text'
            name='search'
            :placeholder='L("Find a DM")'
          )

      .c-no-active-dms-container(v-if='hasNoActiveDms')
        i.icon-comment-dots.c-check-icon
        i18n.has-text-1 No active DMs yet.

      template(v-else)
        .c-dm-group(
          v-for='dmGroup in ephemeral.dmListSortedByLatest'
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
import { humanDate } from '@model/contracts/shared/time.js'
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
        dmListSortedByLatest: [] // Array<{ dateDisplay: string, items: Array<chatroomDetails> }>
      }
    }
  },
  computed: {
    ...mapGetters([
      'allDirectMessagesDetails'
    ]),
    hasNoActiveDms () {
      return this.ephemeral.dmListSortedByLatest.length === 0
    },
    showChatInterface () {
      return this.$route.name === 'GlobalDirectMessagesConversation' &&
        this.$route.params.chatRoomID
    }
  },
  methods: {
    initAndSortDMList () {
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
          ...directMessageDetails
        })
      }

      this.ephemeral.dmListSortedByLatest = sortedList
    }
  },
  created () {
    this.initAndSortDMList()
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

.c-dm-list {
  @include desktop {
    margin-top: 5.25rem;
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
