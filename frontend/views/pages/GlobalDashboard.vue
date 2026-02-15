<template lang="pug">
page(
  pageTestName='GlobalDashboard'
  pageTestHeaderName='pageHeaderName'
)
  template(#title='') {{ currentTabSetting.title }}

  component(:is='currentContent' :key='tabIds.tab')
</template>

<script>
import sbp from '@sbp/sbp'
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
    tabIds () {
      const pathMatch = this.$route.params.pathMatch || ''
      if (!pathMatch) {
        return { tab: 'news-and-updates', subTab: undefined }
      } else {
        const subPaths = pathMatch.split('/')
        return { tab: subPaths[0], subTab: subPaths[1] }
      }
    },
    currentTabSetting () {
      return GLOBAL_DASHBOARD_SETTINGS[this.tabIds.tab || 'news-and-updates']
    },
    currentContent () {
      return contentComponentsMap[this.tabIds.tab || 'news-and-updates']
    }
  },
  created () {
    sbp('state/vuex/commit', 'setInGlobalDashboard', true)
  },
  beforeDestroy () {
    sbp('state/vuex/commit', 'setInGlobalDashboard', false)
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
