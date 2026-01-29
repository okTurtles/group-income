<template lang='pug'>
  .settings-container
    section.card
      i18n.is-title-3.c-title(tag='h2') Browser notifications
      .c-subcontent
        .c-text-content
          i18n.c-smaller-title(tag='h3') Allow browser notifications
          i18n.c-description(tag='p') Get notifications to find out what's going on when you're not on Group Income. You can turn them off anytime.
          p
            i18n.c-description(v-if='!pushNotificationSupported' tag='strong') Your browser doesn't support push notifications
            i18n.has-text-danger(v-else-if='pushNotificationGranted === false' tag='strong') Push notifications are disabled because your browser settings have disabled them.
        .switch-wrapper
          input.switch(
            type='checkbox'
            name='switch'
            v-model='checkboxValue'
            @click='handleNotificationSettings'
          )
        //- TODO: disable the checkbox and display an info field when we're offline

      notification-volume
</template>

<script>
import { mapMutations } from 'vuex'
import { L } from '@common/common.js'
import {
  requestNotificationPermission,
  makeNotification
} from '@model/notifications/nativeNotification.js'
import NotificationVolume from './NotificationVolume.vue'

export default ({
  name: 'NotificationSettings',
  components: {
    NotificationVolume
  },
  data () {
    return {
      pushNotificationSupported: false,
      pushNotificationGranted: null,
      cancelListener: () => {},
      checkboxValue: false
    }
  },
  beforeMount () {
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
        this.checkboxValue = this.notificationEnabled === true && newPermission
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
  computed: {
    notificationEnabled () {
      return this.$store.state.settings.notificationEnabled
    },
    notificationsToggleDisabled () {
      return !this.pushNotificationSupported || (!this.pushNotificationGranted && this.notificationEnabled)
    }
  },
  methods: {
    ...mapMutations(['setNotificationEnabled']),
    async handleNotificationSettings (e) {
      if (typeof Notification !== 'function') return
      let permission = Notification.permission
      const disableCheckbox = () => {
        this.$nextTick(() => { this.checkboxValue = false })
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
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.settings-container {
  width: 100%;

  .c-title {
    margin-bottom: 2rem;
  }
}

.c-subcontent {
  border: none;
  display: flex;
  justify-content: space-between;
  column-gap: 1rem;
  margin-bottom: 2.5rem;

  &:last-child {
    margin-bottom: 1.5rem;
  }
}

.c-smaller-title {
  font-size: $size_4;
  font-weight: bold;
}

.c-description {
  margin-top: 0.125rem;
  font-size: $size_4;
  color: $text_1;
}

.c-name {
  color: $text_1;
  text-transform: uppercase;
  font-size: 0.75rem;
  margin-top: -1rem;
  margin-bottom: 1.5rem;
}
</style>
