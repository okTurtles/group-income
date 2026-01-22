<template lang='pug'>
page.c-page
  template(#title='')
    i18n User settings

  transition(:name='transitionName' mode='out-in')
    component(:is='componentToRender' :tabId='tabId')
</template>

<script>
import { L } from '@common/common.js'
import Page from '@components/Page.vue'
import UserSettingsMain from '@containers/user-settings/UserSettingsMain.vue'
import UserSettingsTabContainer from '@containers/user-settings/UserSettingsTabContainer.vue'

export default {
  name: 'UserSettings',
  components: {
    Page,
    UserSettingsMain,
    UserSettingsTabContainer
  },
  data () {
    return {
      config: {
        tabs: {
          'my-profile': { name: L('My profile'), dataTest: 'tabMyProfile' },
          'notifications': { name: L('Notifications'), dataTest: 'tabNotifications' },
          'appearance': { name: L('Appearance'), dataTest: 'tabAppearance' },
          'application-logs': { name: L('Application logs'), dataTest: 'tabApplicationLogs' },
          'troubleshooting': { name: L('Troubleshooting'), dataTest: 'tabTroubleshooting' },
          'logout': { name: L('Logout'), dataTest: 'tabLogout' },
          'delete-account': { name: L('Delete account'), dataTest: 'tabDeleteAccount' }
        }
      }
    }
  },
  computed: {
    tabId () {
      return this.$route.params.tabId || 'main'
    },
    isMainTab () {
      return this.tabId === 'main'
    },
    componentToRender () {
      return this.isMainTab ? UserSettingsMain : UserSettingsTabContainer
    },
    transitionName () {
      return this.isMainTab ? 'in-left-out-right' : 'in-right-out-left'
    }
  },
  methods: {
    isRoutePathValid (pathMatch) {
      return !pathMatch || pathMatch.split('/').length <= 2
    }
  },
  created () {
    if (!this.isRoutePathValid(this.$route.params.pathMatch)) {
      this.$router.push({ name: 'UserSettings' })
    }
  },
  provide () {
    return {
      userSettingsTabNames: this.config.tabs
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-page ::v-deep .p-main {
  max-width: 37rem;
}
</style>
