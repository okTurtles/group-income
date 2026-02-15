<template lang='pug'>
.c-news-and-updates-container
  i18n(tag='p') Direct Messages: Coming soon!

  ul
    li.c-dm-item(
      v-for='(dmDetails, chatRoomID) in allDirectMessagesDetails'
      :key='chatRoomID'
    )
      div {{ dmDetails.title }}
      .has-text-1 {{ getLatestMessageText(dmDetails.latestMessages) }}

</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { EVENT_HANDLED } from '@chelonia/lib/events'

export default {
  name: 'DirectMessages',
  computed: {
    ...mapGetters([
      'allDirectMessagesDetails'
    ])
  },
  methods: {
    getLatestMessageText (messages) {
      return messages?.length > 0
        ? messages[messages.length - 1]?.text || 'No messages yet'
        : 'No messages yet'
    },
    listenChatRoomActions (contractID, message) {
      const myDMContractIDs = Object.keys(this.allDirectMessagesDetails)

      if (myDMContractIDs.includes(contractID)) {
        console.log('!@# new message received in my DM:', contractID)
        console.log('!@# state: ', sbp('state/vuex/state')[contractID]?.messages)
      }
    }
  },
  mounted () {
    sbp('okTurtles.events/on', EVENT_HANDLED, this.listenChatRoomActions)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', EVENT_HANDLED, this.listenChatRoomActions)
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-dm-item {
  margin-bottom: 0.75rem;
}
</style>
