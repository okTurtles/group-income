<template lang='pug'>
  .settings-container
    section.card
      i18n.is-title-2.c-title(tag='h2') Settings
      .c-subcontent
        .c-text-content
          i18n.c-smaller-title(tag='h3') Notification Permission
          i18n.help(tag='p') When you get chat mentions, browser notification will pop up.
        label
          i18n.sr-only Notification Permission
          input.switch(
            ref='permission'
            type='checkbox'
            name='switch'
            :disabled='disabled'
            :checked='granted'
            @change='handleNotificationSettings'
          )
</template>

<script>
import { mapMutations, mapState } from 'vuex'
import { L } from '@common/common.js'
import {
  requestNotificationPermission,
  makeNotification
} from '@model/contracts/shared/nativeNotification.js'

export default ({
  name: 'NotificationSettings',
  data () {
    return {
      granted: false,
      disabled: false
    }
  },
  mounted () {
    const permission = Notification?.permission
    if (permission === null) {
      this.disabled = true
    } else {
      this.granted = permission === 'granted' && this.notificationGranted
    }
  },
  computed: {
    ...mapState([
      'notificationGranted'
    ])
  },
  methods: {
    ...mapMutations([
      'setNotificationGranted'
    ]),
    async handleNotificationSettings (e) {
      let permission = Notification?.permission
      if (permission === null) {
        this.setNotificationGranted(false)
        return
      } else if (permission !== 'granted') {
        permission = await requestNotificationPermission(true)
      }
      const granted = e.target.checked && permission === 'granted'
      this.setNotificationGranted(granted)
      this.$refs.permission.checked = granted

      if (granted) {
        makeNotification({
          title: L('Congratulations'),
          body: L('You have granted browser notification!')
        })
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
</style>
