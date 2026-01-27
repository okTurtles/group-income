<template lang='pug'>
page.c-page
  template(#title='') {{ pageTitle }}

  transition(:name='transitionName' mode='out-in')
    component(:is='componentToRender')
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
          'main': { name: L('User Settings') },
          'my-profile': { name: L('My profile'), dataTest: 'tabMyProfile', pathTo: 'my-profile' },
          'notifications': { name: L('Notifications'), dataTest: 'tabNotifications', pathTo: 'notifications' },
          'appearance': { name: L('Appearance'), dataTest: 'tabAppearance', pathTo: 'appearance' },
          'theme': { name: L('Theme'), dataTest: 'tabTheme' },
          'text-size': { name: L('Text size'), dataTest: 'tabTextSize' },
          'reduced-motion': { name: L('Reduced motion'), dataTest: 'tabReducedMotion' },
          'increased-contrast': { name: L('Increased contrast'), dataTest: 'tabIncreasedContrast' },
          'application-logs': { name: L('Application logs'), dataTest: 'tabApplicationLogs', pathTo: 'application-logs' },
          'troubleshooting': { name: L('Troubleshooting'), dataTest: 'tabTroubleshooting', pathTo: 'troubleshooting' },
          'logout': { name: L('Logout'), dataTest: 'tabLogout' },
          'delete-account': { name: L('Delete account'), dataTest: 'tabDeleteAccount' }
        }
      }
    }
  },
  computed: {
    tabIds () {
      const pathMatch = this.$route.params.pathMatch || ''

      if (!pathMatch) {
        return { tab: 'main', subTab: null }
      } else {
        const subPaths = pathMatch.split('/')
        return { tab: subPaths[0], subTab: subPaths[1] }
      }
    },
    isMainTab () {
      return this.tabIds.tab === 'main'
    },
    componentToRender () {
      return this.isMainTab ? UserSettingsMain : UserSettingsTabContainer
    },
    transitionName () {
      return this.isMainTab ? 'in-left-out-right' : 'in-right-out-left'
    },
    pageTitle () {
      return this.config.tabs[this.tabIds.tab]
        ? this.config.tabs[this.tabIds.tab].name
        : this.config.tabs.main.name
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
    const tabIds = {}
    // Defining properties like below ensures these are reactive across the component tree. (Vue 2 only)
    Object.defineProperties(tabIds, {
      tab: {
        enumerable: true,
        get: () => this.tabIds.tab
      },
      subTab: {
        enumerable: true,
        get: () => this.tabIds.subTab
      }
    })

    return {
      userSettingsTabNames: this.config.tabs,
      userSettingsTabIds: tabIds
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
