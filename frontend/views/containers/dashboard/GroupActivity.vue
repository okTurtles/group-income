<template lang='pug'>
section.card
  nav.tabs(
    v-if='tabItems.length > 0'
    :aria-label='L("Payments type")'
    data-test='payNav'
  )
    button.is-unstyled.tabs-link(
      v-for='(link, index) in tabItems'
      :key='index'
      :class='{ "is-active": ephemeral.activeTab === link.url}'
      :data-test='`link-${link.url}`'
      :aria-expanded='ephemeral.activeTab === link.url'
      @click='handleTabClick(link.url)'
    )
      | {{ link.title }}

  .tab-section
    .c-container
      component(:is='ephemeral.activeTab')

</template>

<script>
import Overview from '@components/graphs/Overview.vue'
import SupportHistory from '@containers/contributions/SupportHistory.vue'
import TodoHistory from '@containers/contributions/TodoHistory.vue'

import { L } from '@common/common.js'
export default ({
  name: 'GroupActivity',
  data () {
    return {
      tabItems: [{
        title: L('Overview'),
        url: 'Overview'
      }, {
        title: L('Support %'),
        url: 'SupportHistory'
      }, {
        title: L('Todo %'),
        url: 'TodoHistory'
      }, {
        title: L('Activity'),
        url: 'Overview'
      }],
      ephemeral: {
        activeTab: 'Overview'
      }
    }
  },
  components: {
    Overview,
    SupportHistory,
    TodoHistory
  },
  methods: {
    handleTabClick (url) {
      this.ephemeral.activeTab = url
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-container {
  margin-top: 2rem;
}

.tabs {
  max-width: calc(100vw - 2rem);
}

.tabs-link {
  min-width: 0;
}
</style>
