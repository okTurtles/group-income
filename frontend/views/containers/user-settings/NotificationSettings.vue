<template lang='pug'>
  .settings-container
    .menu-tile-block
      legend.tab-legend
        i.icon-bell.legend-icon
        i18n.legend-text Browser notifications

      menu
        MenuItem(
          tabId='browser-notifications'
          :isExpandable='true'
        )
          template(#info='')
            label
              i18n.sr-only Allow browser notifications
              input.switch.is-small.c-switch(
                type='checkbox'
                name='switch'
                :disabled='notificationsToggleDisabled'
                v-model='ephemeral.browserNotificationsEnabled'
                @click.stop='handleNotificationSettings'
              )

          template(#lower='')
            .lower-section-container
              i18n.c-description(tag='p') Get notifications to find out what's going on when you're not on Group Income. You can turn them off anytime.
              p.c-mt-1(v-if='pushNotificationInfoMsg')
                strong(:class='{ "has-text-danger": pushNotificationGranted === false }') {{ pushNotificationInfoMsg }}
            //- TODO: disable the checkbox and display an info field when we're offline

        MenuItem(
          tabId='browser-notification-volume'
          :isExpandable='true'
          :variant='ephemeral.browserNotificationsEnabled ? "default" : "disabled"'
        )
          template(#info='')
            p.c-current-volume {{ currVolumeDisplay }}

          template(#lower='')
            .lower-section-container
              notification-volume(@volume-change='handleVolumeChange')

    chat-default-notification-settings
</template>

<script>
import { mapMutations } from 'vuex'
import { L } from '@common/common.js'
import {
  requestNotificationPermission,
  makeNotification
} from '@model/notifications/nativeNotification.js'
import NotificationVolume from './NotificationVolume.vue'
import ChatDefaultNotificationSettings from './ChatDefaultNotificationSettings.vue'
import UserSettingsTabMenuItem from './UserSettingsTabMenuItem.vue'

export default ({
  name: 'NotificationSettings',
  components: {
    NotificationVolume,
    MenuItem: UserSettingsTabMenuItem,
    ChatDefaultNotificationSettings
  },
  data () {
    return {
      pushNotificationSupported: false,
      pushNotificationGranted: null,
      cancelListener: () => {},
      ephemeral: {
        browserNotificationsEnabled: false,
        currentVolume: 1
      }
    }
  },
  computed: {
    notificationEnabled () {
      return this.$store.state.settings.notificationEnabled
    },
    notificationsToggleDisabled () {
      return !this.pushNotificationSupported || (!this.pushNotificationGranted && this.notificationEnabled)
    },
    pushNotificationInfoMsg () {
      return !this.pushNotificationSupported
        ? L("Your browser doesn't support push notifications.")
        : this.pushNotificationGranted === false
          ? L('Push notifications are disabled because your browser settings have disabled them.')
          : null
    },
    currVolumeDisplay () {
      return `${Math.round(this.ephemeral.currentVolume)}%`
    }
  },
  beforeMount () {
    this.ephemeral.currentVolume = (this.$store.getters.notificationVolume ?? 1) * 100
    if (typeof Notification !== 'function' || typeof PushManager !== 'function' || !navigator.serviceWorker) {
      this.pushNotificationGranted = false
      return
    }
    this.pushNotificationSupported = true
    const handler = (permissionState) => {
      let newPermission = null
      if (permissionState === 'granted') {
        newPermission = true
      } else if (permissionState === 'denied') {
        newPermission = false
      }
      // since the fallback calls this handler repeatedly and often, have this check here
      if (newPermission !== this.pushNotificationGranted) {
        this.pushNotificationGranted = newPermission
        this.ephemeral.browserNotificationsEnabled = this.notificationEnabled === true && newPermission
        console.info('[NotifSettings] handler called with:', permissionState, 'and this.notificationsEnabled=', this.notificationEnabled)
      }
    }
    const fallback = () => {
      handler(Notification.permission)
      const intervalId = setInterval(() => {
        handler(Notification.permission)
      }, 500)
      this.cancelListener = () => clearInterval(intervalId)
    }
    // Check if browser is Webkit-based
    const isWebkit = typeof navigator === 'object' && navigator.vendor === 'Apple Computer, Inc.'
    if (
      !isWebkit &&
      typeof navigator.permissions === 'object' &&
      // $FlowFixMe[method-unbinding]
      typeof navigator.permissions.query === 'function'
    ) {
      navigator.permissions.query({ name: 'notifications' }).then((status) => {
        const listener = () => {
          // For some reason, Safari seems to always return `'prompt'` with
          // `Notification.permission` being correct.
          const state = (status.state === 'prompt' && Notification.permission !== 'default') ? Notification.permission : status.state
          handler(state)
        }
        listener()
        status.addEventListener('change', listener, false)
        this.cancelListener = () => status.removeEventListener('change', listener, false)
      }, fallback)
    } else {
      fallback()
    }
  },
  destroyed () {
    this.cancelListener()
  },
  methods: {
    ...mapMutations(['setNotificationEnabled']),
    async handleNotificationSettings () {
      if (typeof Notification !== 'function') return
      let permission = Notification.permission

      const disableCheckbox = () => {
        this.$nextTick(() => { this.ephemeral.browserNotificationsEnabled = false })
      }
      if (permission === 'default') {
        permission = await requestNotificationPermission()
        if (!permission) {
          alert(L('There was a problem requesting notifications permission'))
          return disableCheckbox()
        } else if (permission !== 'granted') {
          return disableCheckbox()
        }
      } else if (permission === 'denied') {
        // attempt to request permissions again
        permission = await requestNotificationPermission()
        if (!permission) {
          alert(L('There was a problem requesting notifications permission'))
          return disableCheckbox()
        } else if (permission !== 'granted') {
          alert(L('Try granting notifications permissions in your browser settings first'))
          return disableCheckbox()
        }
      } else if (permission === 'granted' && this.notificationEnabled) {
        permission = 'denied'
      }
      const granted = permission === 'granted'
      this.setNotificationEnabled(granted)
      if (granted) {
        makeNotification({ title: L('Congratulations'), body: L('You have granted browser notification!') })
      }
    },
    handleVolumeChange (volume) {
      this.ephemeral.currentVolume = volume
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.settings-container {
  width: 100%;
}

.c-description {
  margin-top: 0.125rem;
  font-size: $size_4;
  color: $text_1;
}

.c-mt-1 {
  margin-top: 1rem;
}
</style>
