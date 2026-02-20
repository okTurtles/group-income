<template lang="pug">
page(
  pageTestName='GlobalDashboard'
  pageTestHeaderName='pageHeaderName'
)
  template(#title='') {{ currentTabSetting.title }}

  component(:is='currentContent' :key='$route.params.id')
</template>

<script>
import { L } from '@common/common.js'
import Page from '@components/Page.vue'
import NewsAndUpdates from '@containers/global-dashboard/NewsAndUpdates.vue'
import DirectMessages from '@containers/global-dashboard/direct-messages/DirectMessages.vue'

export const GLOBAL_DASHBOARD_SETTINGS: {[string]: Object } = {
  'news-and-updates': {
    title: L('News & Updates'),
    routeTo: '/global-dashboard/news-and-updates',
    icon: 'newspaper'
  },
  'direct-messages': {
    title: L('Direct Messages'),
    routeTo: '/global-dashboard/direct-messages',
    icon: 'comment'
  }
}

const contentComponentsMap = {
  'news-and-updates': NewsAndUpdates,
  'direct-messages': DirectMessages
}

export default ({
  name: 'GlobalDashboard',
  components: {
    Page
  },
  computed: {
    currentTabSetting () {
      return GLOBAL_DASHBOARD_SETTINGS[this.$route.params.id || 'news-and-updates']
    },
    currentContent () {
      return contentComponentsMap[this.$route.params.id || 'news-and-updates']
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
