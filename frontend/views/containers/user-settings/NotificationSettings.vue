<template lang='pug'>
  .settings-container
    section.card
      i18n.is-title-3.c-title(tag='h2') Browser notifications
      .c-divider
      .c-subcontent
        .c-text-content
          i18n.c-smaller-title(tag='h3') Allow browser notifications
          i18n.c-description(tag='p') Get notifications to find out what's going on when you're not on Group Income. You can turn them off anytime.
          p
            i18n.c-description(v-if='!pushNotificationSupported' tag='strong') Your browser doesn't support push notifications
            i18n.c-description(v-else-if='pushNotificationGranted !== null && !inconsistentNotificationEnabled' tag='strong') Once set, the notification permission can only be adjusted by the browser in the browser settings.
        .switch-wrapper
          input.switch(
            type='checkbox'
            name='switch'
            v-model='checkboxValue'
            :disabled='notificationsToggleDisabled'
            @click='handleNotificationSettings'
          )
        //- TODO: disable the checkbox and display an info field when we're offline
</template>

<script>
import { mapMutations } from 'vuex'
import { L } from '@common/common.js'
import {
  requestNotificationPermission,
  makeNotification
} from '@model/notifications/nativeNotification.js'

export default ({
  name: 'NotificationSettings',
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
      if (permissionState === 'granted') {
        this.pushNotificationGranted = true
      } else if (permissionState === 'denied') {
        this.pushNotificationGranted = false
      } else {
        this.pushNotificationGranted = null
      }
    }
    const fallback = () => {
      handler(Notification.permission)
      const intervalId = setInterval(() => {
        handler(Notification.permission)
      }, 500)
      this.cancelListener = () => clearInterval(intervalId)
    }
    if (
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
  mounted () {
    this.checkboxValue = this.notificationEnabled
  },
  destroyed () {
    this.cancelListener()
  },
  computed: {
    notificationEnabled () {
      return this.$store.state.settings.notificationEnabled
    },
    inconsistentNotificationEnabled () {
      // This can happen if the permission has been granted but setting up
      // the push subscription failed. In this case, we show the toggle for
      // manually letting users set up a push subscription.
      return this.notificationEnabled && this.pushNotificationGranted === false
    },
    notificationsToggleDisabled () {
      return !this.pushNotificationSupported || (this.pushNotificationGranted && this.inconsistentNotificationEnabled)
    }
  },
  watch: {
    notificationEnabled (to, from) {
      this.checkboxValue = to
    }
  },
  methods: {
    ...mapMutations(['setNotificationEnabled']),
    async handleNotificationSettings (e) {
      if (typeof Notification !== 'function') return
      let permission = Notification.permission
      if (permission === 'default') {
        permission = await requestNotificationPermission()
        if (!permission) {
          alert(L('There was a problem requesting notifications permission'))
          return
        }
      } else if (permission === 'denied') {
        // attempt to request permissions again
        permission = await requestNotificationPermission()
        if (!permission) {
          alert(L('There was a problem requesting notifications permission'))
          return
        } else if (permission !== 'granted') {
          alert(L('Try granting notifications permissions in your browser settings first'))
        }
      } else if (permission === 'granted' && this.notificationEnabled) {
        permission = 'denied'
      }
      const granted = permission === 'granted'
      this.setNotificationEnabled(granted)
      this.$nextTick(() => {
        this.checkboxValue = this.notificationEnabled
      })
      if (granted) {
        setTimeout(() => {
          // 'setNotificationEnabled' will disable notifications within 100 msec if there was an error enabling them
          if (this.notificationEnabled) {
            makeNotification({ title: L('Congratulations'), body: L('You have granted browser notification!') })
          }
        }, 500)
      }
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.settings-container {
  width: 100%;

  @include desktop {
    padding-top: 1.5rem;
  }

  .c-title {
    margin-bottom: 1rem;
  }
}

.c-subcontent {
  border: none;
  display: flex;
  justify-content: space-between;
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

.c-divider {
  margin: -0.5rem -1rem 1.5rem -1rem;
  border: solid 1px $general_1;

  @include tablet {
    margin: -0.5rem -1.5rem 1.5rem -1.5rem;
  }

  @include desktop {
    margin: -0.5rem -2.5rem 1.5rem -2.5rem;
  }
}

.c-name {
  color: $text_1;
  text-transform: uppercase;
  font-size: 0.75rem;
  margin-top: -1rem;
  margin-bottom: 1.5rem;
}
</style>
