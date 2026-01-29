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
      MenuItem(
        tabId='logout'
        variant='outlined'
        :noIcon='true'
        @click='handleLogout'
      )

  .menu-tile-block.has-bottom-separator
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

  .c-version-info-block
    .version-item
      i18n App Version:
      span.c-version-value {{ ephemeral.versions.app }}
    .version-item
      i18n Contracts Version:
      span.c-version-value {{ ephemeral.versions.contracts }}
    .version-item
      i18n SW Version:
      span.c-version-value(
        :class='{ "is-loading": ephemeral.versions.loadingSWVersion }'
      ) {{ ephemeral.versions.loadingSWVersion ? '' : ephemeral.versions.sw }}

    i18n.is-unstyled.c-acknowledgements(tag='button' @click.stop='onAcknowledgementsClick') Acknowledgements

</template>

<script>
import sbp from '@sbp/sbp'
import { OPEN_MODAL } from '@utils/events.js'
import UserSettingsTabMenuItem from './UserSettingsTabMenuItem.vue'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

export default {
  name: 'UserSettingsMain',
  components: {
    MenuItem: UserSettingsTabMenuItem
  },
  data () {
    return {
      ephemeral: {
        versions: {
          loadingSWVersion: false,
          app: '-',
          contracts: '-',
          sw: '-'
        }
      }
    }
  },
  methods: {
    handleDeleteAccount () {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'AccountRemovalModal')
    },
    async loadVersionInfo () {
      this.ephemeral.versions.app = process.env.GI_VERSION.split('@')[0]
      this.ephemeral.versions.contracts = process.env.CONTRACTS_VERSION

      try {
        this.ephemeral.versions.loadingSWVersion = true
        this.ephemeral.versions.sw = (await sbp('sw/version')).GI_GIT_VERSION.slice(1)
      } catch (e) {
        console.error('UserSettingsMain.vue failed to load sw version info:', e)
      } finally {
        this.ephemeral.versions.loadingSWVersion = false
      }
    },
    onAcknowledgementsClick () {
      this.$router.push({ path: '/user-settings/acknowledgements' }).catch(logExceptNavigationDuplicated)
    },
    async handleLogout () {
      try {
        await sbp('gi.app/identity/logout')
      } catch (e) {
        console.error('Error in handleLogout:', e)
        alert(`An error occurred while logging out: ${e}`)
      }
    }
  },
  created () {
    this.loadVersionInfo()
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-user-settings-main {
  margin-top: 1rem;
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

.c-version-info-block {
  position: relative;
  width: 100%;
  color: $text_1;
  font-size: $size_5;
  margin-bottom: 4.25rem;
  text-align: right;
}

.version-item {
  display: flex;
  column-gap: 0.325rem;
  align-items: center;
  justify-content: flex-end;
}

.c-version-value {
  position: relative;
  display: inline-block;
  flex-shrink: 0;

  &.is-loading {
    width: 1.75rem;
    height: 0.825rem;

    &::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: $radius;
      z-index: 1;
      background-color: $general_1;
      animation: loading-heartbeat 3s infinite;
    }
  }
}

.c-acknowledgements {
  display: inline-block;
  text-decoration: underline;
  margin-top: 1rem;
  transition: color 0.2s ease-out;

  &:hover,
  &:focus,
  &:focus-within {
    color: $text_0;
  }
}
</style>
