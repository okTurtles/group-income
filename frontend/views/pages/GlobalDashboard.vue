<template lang="pug">
page(
  pageTestName='GlobalDashboard'
  pageTestHeaderName='pageHeaderName'
)
  template(#title='') {{ currentTabSetting.title }}
  .c-global-dashboard-content
    i18n(tag='p') Coming soon!
</template>

<script>
import Page from '@components/Page.vue'
import { GLOBAL_DASHBOARD_SETTINGS } from '@controller/utils/misc.js'

export default ({
  name: 'GlobalDashboard',
  components: {
    Page
  },
  computed: {
    currentTabSetting () {
      return GLOBAL_DASHBOARD_SETTINGS[this.$route.params.id || 'news-and-updates']
    }
  }
})
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
