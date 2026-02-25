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
    .card.c-search-container
      .inputgroup
        .is-icon.prefix(aria-hidden='true')
          i.icon-search
        input.input(
          type='text'
          name='search'
          :placeholder='L("Find a DM")'
        )

    .c-no-active-dms-container
      i.icon-comment-dots.c-check-icon
      i18n.has-text-1 No active DMs yet.
</template>

<script>
import { mapGetters } from 'vuex'
import Page from '@components/Page.vue'
import ChatNav from '@containers/chatroom/ChatNav.vue'
import ChatMembers from '@containers/chatroom/ChatMembers.vue'
import { humanDate } from '@model/contracts/shared/time.js'

export default {
  name: 'DirectMessages',
  components: {
    Page,
    ChatNav,
    ChatMembers
  },
  data () {
    return {
      ephemeral: {
        dmListSortedByLatest: {} // { [dateDisplay]: Array<chatroomDetails>, ... }
      }
    }
  },
  computed: {
    ...mapGetters([
      'allDirectMessagesDetails'
    ])
  },
  methods: {
    initAndSortDMList () {
      for (const [chatRoomID, directMessageDetails] of Object.entries(this.allDirectMessagesDetails)) {
        const { lastMsgTimeStamp } = directMessageDetails
        const dateDisplay = humanDate(lastMsgTimeStamp, { month: 'long', day: 'numeric', year: 'numeric' })

        if (!this.ephemeral.dmListSortedByLatest[dateDisplay]) {
          this.ephemeral.dmListSortedByLatest[dateDisplay] = []
        }

        this.ephemeral.dmListSortedByLatest[dateDisplay].push({
          chatRoomID,
          ...directMessageDetails
        })
      }

      console.log('!@# dm sorted list: ', this.ephemeral.dmListSortedByLatest)
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
  margin-top: 1.5rem;
  max-width: 42rem;
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
}

.c-dm-list {
  @include desktop {
    margin-top: 5.25rem;
  }
}
</style>
