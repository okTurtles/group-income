<template lang='pug'>
.c-user-settings-main
  .c-menu-block
    legend.tab-legend
      i.icon-user.legend-icon
      i18n.legend-text Account

    menu.c-menu
      MenuItem(tabId='my-profile')
</template>

<script>
import UserSettingsTabMenuItem from './UserSettingsTabMenuItem.vue'

export default {
  name: 'UserSettingsMain',
  components: {
    MenuItem: UserSettingsTabMenuItem
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-user-settings-main {
  margin-top: 1rem;

  @include desktop {
    margin-top: 3rem;
  }
}

.c-menu-block {
  width: 100%;
  margin-bottom: 2.5rem;
}
</style>
