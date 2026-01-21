<template lang='pug'>
.c-user-settings-main
  .menu-tile-block
    legend.tab-legend
      i.icon-user.legend-icon
      i18n.legend-text Account

    menu
      MenuItem(tabId='my-profile')

  .menu-tile-block
    legend.tab-legend
      i.icon-cog.legend-icon
      i18n.legend-text App settings

    menu
      MenuItem(tabId='notifications')
      MenuItem(tabId='appearance')

  .menu-tile-block.has-bottom-separator
    legend.tab-legend
      i.icon-search.legend-icon
      i18n.legend-text Advanced

    menu
      MenuItem(tabId='application-logs')
      MenuItem(tabId='troubleshooting')

  .menu-tile-block
    menu
      MenuItem(tabId='logout' variant='outlined')

  .menu-tile-block
    legend.tab-legend
      i.icon-exclamation-triangle.legend-icon
      i18n.legend-text Danger Zone

    menu
      MenuItem(
        tabId='delete-account'
        variant='danger'
        :isExpandable='true'
      )
        template(#lower='')
          .c-menu-item-lower-section-container
            p.c-delete-account-text
              i18n.has-text-1 Deleting your account will erase all your data, and remove you from the groups you belong to.
              | {{ ' ' }}
              i18n.has-text-danger This action cannot be undone.

            .buttons
              i18n.button.is-danger.is-outlined(
                tag='button'
                type='button'
                data-test='deleteAccount'
                @click='handleDeleteAccount'
              ) Delete account
</template>

<script>
import sbp from '@sbp/sbp'
import { OPEN_MODAL } from '@utils/events.js'
import UserSettingsTabMenuItem from './UserSettingsTabMenuItem.vue'

export default {
  name: 'UserSettingsMain',
  components: {
    MenuItem: UserSettingsTabMenuItem
  },
  methods: {
    handleDeleteAccount () {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'AccountRemovalModal')
    }
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

.c-menu-item-lower-section-container {
  position: relative;
  width: 100%;

  > * {
    white-space: normal;
  }
}

.c-delete-account-text {
  margin-bottom: 1.5rem;
}
</style>
