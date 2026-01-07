<template lang='pug'>
page.c-page
  template(#title='') {{ L('Group Settings') }}
  template(#description='')
    p.p-descritpion.has-text-1 {{ L('Changes to these settings will be visible to all group members') }}

  transition(:name='transitionName' mode='out-in')
    component(:is='componentToRender' :tabId='tabId')
</template>

<script>
import Page from '@components/Page.vue'
import GroupSettingsMain from '@containers/group-settings/GroupSettingsMain.vue'
import GroupSettingsTabContainer from '@containers/group-settings/GroupSettingsTabContainer.vue'

export default {
  name: 'GroupSettings',
  components: {
    Page
  },
  computed: {
    tabId () {
      return this.$route.params.tabId
    },
    componentToRender () {
      return this.tabId ? GroupSettingsTabContainer : GroupSettingsMain
    },
    transitionName () {
      return this.tabId ? 'show-tab-content' : 'show-main-menu'
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
  transform: translateX(-50%);
}

.show-main-menu-leave-to {
  transform: translateX(50%);
}

.show-tab-content-enter {
  transform: translateX(50%);
}

.show-tab-content-leave-to {
  transform: translateX(-50%);
}

.show-main-menu-enter-active,
.show-main-menu-leave-active,
.show-tab-content-enter-active,
.show-tab-content-leave-active {
  transition: transform 0.3s ease, opacity 200ms ease;
}
</style>
