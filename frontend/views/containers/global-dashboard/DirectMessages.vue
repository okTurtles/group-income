<template lang='pug'>
.c-news-and-updates-container
  .card.c-search-input-card
    search.c-search(
      :label='config.searchLabel'
      :placeholder='config.searchPlaceholder'
      v-model='form.search'
    )

  p.c-no-items
    i.icon-info-circle.is-prefix
    i18n.has-text-1 No DMs to display..
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { L } from '@common/common.js'
import Search from '@components/Search.vue'
import { CHATROOM_ACTIONS_PER_PAGE } from '@model/contracts/shared/constants.js'
// DEV_NOTE - fetching DM message data
// 1. refer to 'loadMessagesFromStorage' method in ChatMain.vue
// 2. L805

const collectEventStream = async (s: ReadableStream) => {
  const reader = s.getReader()
  const r = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    r.push(value)
  }
  return r
}

export default ({
  name: 'DirectMessages',
  components: {
    Search
  },
  data () {
    return {
      form: {
        search: ''
      },
      config: {
        searchPlaceholder: L('Find a DM'),
        searchLabel: L('Search a DM')
      }
    }
  },
  computed: {
    ...mapGetters([
      'ourDirectMessages',
      'ourIdentityContractId'
    ])
  },
  methods: {
    async loadDMs () {
      const chatroomIds = Object.keys(this.ourDirectMessages)
        .filter(id => this.ourDirectMessages[id].visible)
      const data = await Promise.all(chatroomIds.map(this.getEventsByChatroomId))

      console.log('All DM data: ', data)
    },
    async getEventsByChatroomId (chatroomId) {
      const storageKeyFromChatroomId = (id) => `messages/${this.ourIdentityContractId}/${id}`
      const eventsFromStorage = await sbp('gi.db/archive/load', storageKeyFromChatroomId(chatroomId))

      if (eventsFromStorage) {
        return JSON.parse(eventsFromStorage)
      } else {
        const { height: latestHeight } = await sbp('chelonia/out/latestHEADInfo', chatroomId)
        const events = await collectEventStream(sbp('chelonia/out/eventsBefore', chatroomId, latestHeight, CHATROOM_ACTIONS_PER_PAGE))

        return events
      }
    }
  },
  created () {
    this.loadDMs()
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-search-input-card {
  padding: 1.5rem;
  margin-bottom: 2.5rem;
}

.c-no-items {
  padding-left: 1.5rem;
}
</style>
