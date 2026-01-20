<template lang='pug'>
page.c-page
  template(#title='') {{ pageTitle }}
  template(#description='')
    p.p-descritpion.has-text-1 {{ L('Changes to these settings will be visible to all group members') }}

  transition(:name='transitionName' mode='out-in')
    component(:is='componentToRender' :tabId='tabId')
</template>

<script>
import { L } from '@common/common.js'
import Page from '@components/Page.vue'
import GroupSettingsMain from '@containers/group-settings/GroupSettingsMain.vue'
import GroupSettingsTabContainer from '@containers/group-settings/GroupSettingsTabContainer.vue'

export default {
  name: 'GroupSettings',
  components: {
    Page
  },
  data () {
    return {
      config: {
        tabNamesMap: {
          'public-channels': { displayName: L('Public Channels'), dataTest: 'tabPublicChannels' },
          'main': { displayName: L('Group Settings') },
          'group-profile': { displayName: L('Group Profile'), dataTest: 'tabGroupProfile' },
          'group-currency': { displayName: L('Group Currency'), dataTest: 'tabGroupCurrency' },
          'invite-links': { displayName: L('Invite Links'), dataTest: 'tabInviteLinks' },
          'roles-and-permissions': { displayName: L('Roles & Permissions'), dataTest: 'tabRolesAndPermissions' },
          'voting-rules': { displayName: L('Voting Rules'), dataTest: 'tabVotingRules' },
          'leave-group': { displayName: L('Leave Group'), dataTest: 'tabLeaveGroup' }
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
      return this.isMainTab ? GroupSettingsMain : GroupSettingsTabContainer
    },
    transitionName () {
      return this.isMainTab ? 'in-left-out-right' : 'in-right-out-left'
    },
    pageTitle () {
      return this.config.tabNamesMap[this.tabId]
        ? this.config.tabNamesMap[this.tabId].displayName
        : this.config.tabNamesMap.main.displayName
    }
  },
  provide () {
    return {
      groupSettingsTabNames: this.config.tabNamesMap
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-page ::v-deep .p-main {
  max-width: 37rem;
}

.p-descritpion {
  display: none;
  margin-top: 0.25rem;

  @include desktop {
    display: block;
  }
}
</style>
