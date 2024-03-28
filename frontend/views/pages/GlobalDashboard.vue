<template lang="pug">
page(
  pageTestName='GlobalDashboard'
  pageTestHeaderName='pageHeaderName'
)
  template(#title='') {{ currentTabSetting.title }}

  component(:is='currentContent' :key='$route.params.id')
</template>

<script>
import Page from '@components/Page.vue'
import NewsAndUpdates from '@containers/global-dashboard/NewsAndUpdates.vue'
import DirectMessages from '@containers/global-dashboard/DirectMessages.vue'
import { GLOBAL_DASHBOARD_SETTINGS } from '@controller/utils/misc.js'

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
