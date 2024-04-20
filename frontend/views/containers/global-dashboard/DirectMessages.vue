<template lang='pug'>
.c-news-and-updates-container
  .card.c-search-input-card
    search.c-search(
      :placeholder='config.searchPlaceholder'
      v-model='form.search'
    )

  p.c-no-items
    i.icon-info-circle.is-prefix
    i18n.has-text-1 No DMs to display..
</template>

<script>
import { L } from '@common/common.js'
import Search from '@components/Search.vue'

// DEV_NOTE:
// fetching DM message data - refer to 'loadMessagesFromStorage' method in ChatMain.vue
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
        searchPlaceholder: L('Find a DM')
      }
    }
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
