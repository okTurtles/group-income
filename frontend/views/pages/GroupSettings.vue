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
          'public-channels': L('Public Channels'),
          'main': L('Group Settings'),
          'group-profile': L('Group Profile'),
          'group-currency': L('Group Currency'),
          'invite-links': L('Invite Links'),
          'roles-and-permissions': L('Roles & Permissions'),
          'voting-rules': L('Voting Rules'),
          'leave-group': L('Leave Group'),
          'delete-group': L('Delete Group')
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
      return this.isMainTab ? 'show-main-menu' : 'show-tab-content'
    },
    pageTitle () {
      return this.config.tabNamesMap[this.tabId] || this.config.tabNamesMap.main
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

.show-main-menu-enter,
.show-main-menu-leave-to,
.show-tab-content-enter,
.show-tab-content-leave-to {
  opacity: 0;
}

.show-main-menu-enter,
.show-tab-content-leave-to {
  transform: translateX(-35%);

  @include from($tablet) {
    transform: translateX(-20%);
  }
}

.show-tab-content-enter,
.show-main-menu-leave-to {
  transform: translateX(35%);

  @include from($tablet) {
    transform: translateX(20%);
  }
}

.show-main-menu-enter-active,
.show-main-menu-leave-active,
.show-tab-content-enter-active,
.show-tab-content-leave-active {
  transition: transform 0.3s ease, opacity 200ms ease;
}
</style>
