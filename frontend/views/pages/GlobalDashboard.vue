<template lang="pug">
page(
  pageTestName='GlobalDashboard'
  pageTestHeaderName='pageHeaderName'
)
  template(#title='') {{ currentTabConfig.pageTitle }}
</template>

<script>
import Page from '@components/Page.vue'
import { L } from '@common/common.js'

const dashboardTabConfigs = {
  'news-and-updates': {
    id: 'new-and-updates',
    pageTitle: L('News & Updates')
  },
  'dms': {
    id: 'dms',
    pageTitle: L('Direct Messages')
  }
}

export default ({
  name: 'GlobalDashboard',
  components: {
    Page
  },
  computed: {
    currentTabConfig () {
      return dashboardTabConfigs[this.$route.params.id || 'news-and-updates']
    }
  }
})
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
