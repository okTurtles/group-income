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
        menus: [
          {
            section: 'general',
            items: [
              { id: 'group-profile', name: L('Group Profile') },
              { id: 'group-currency', name: L('Group Currency') }
            ]
          },
          {
            section: 'access-and-rules',
            items: [
              { id: 'invite-links', name: L('Invite Links') },
              { id: 'roles-and-permissions', name: L('Roles & Permissions') },
              { id: 'voting-rules', name: L('Voting Rules') }
            ]
          },
          {
            section: 'danger-zone',
            items: [
              { id: 'leave-group', name: L('Leave Group') }
            ]
          }
        ]
      }
    }
  },
  computed: {
    tabId () {
      return this.$route.params.tabId || 'main'
    },
    componentToRender () {
      return this.tabId === 'main' ? GroupSettingsMain : GroupSettingsTabContainer
    },
    transitionName () {
      return this.tabId === 'main' ? 'show-main-menu' : 'show-tab-content'
    },
    pageTitle () {
      const allMenuItems = this.config.menus.flatMap(menu => menu.items)

      return this.tabId === 'main'
        ? L('Group Settings')
        : allMenuItems.find(item => item.id === this.tabId)?.name || L('Group Settings')
    }
  },
  provide () {
    return {
      groupSettingsMenus: this.config.menus
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

.show-main-menu-enter {
  transform: translateX(-35%);
}

.show-main-menu-leave-to {
  transform: translateX(35%);
}

.show-tab-content-enter {
  transform: translateX(35%);
}

.show-tab-content-leave-to {
  transform: translateX(-35%);
}

.show-main-menu-enter-active,
.show-main-menu-leave-active,
.show-tab-content-enter-active,
.show-tab-content-leave-active {
  transition: transform 0.3s ease, opacity 200ms ease;
}
</style>
