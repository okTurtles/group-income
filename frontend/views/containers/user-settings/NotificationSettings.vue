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
            :checked='granted'
            @change='handleNotificationSettings'
          )
</template>

<script>
import { mapState, mapMutations } from 'vuex'
import { L } from '@common/common.js'
import {
  requestNotificationPermission,
  makeNotification
} from '@model/contracts/shared/nativeNotification.js'

export default ({
  name: 'NotificationSettings',
  data () {
    return {
      granted: false
    }
  },
  mounted () {
    this.granted = Notification?.permission === 'granted' && this.notificationEnabled
  },
  computed: {
    ...mapState(['notificationEnabled'])
  },
  methods: {
    ...mapMutations([
      'setNotificationEnabled'
    ]),
    async handleNotificationSettings (e) {
      let permission = Notification?.permission

      if (permission === 'default') {
        permission = await requestNotificationPermission(true)
      } else if (permission === 'denied') {
        alert(L('Sorry, you should reset browser notification permission again.'))
      }

      this.$refs.permission.checked = this.granted = e.target.checked && permission === 'granted'
      this.setNotificationEnabled(this.granted)

      if (this.granted) {
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
