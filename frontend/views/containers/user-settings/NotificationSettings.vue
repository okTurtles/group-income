<template lang='pug'>
  .settings-container
    section.card
      i18n.is-title-3.c-title(tag='h2') Browser notifications
      .c-divider
      .c-subcontent
        .c-text-content
          i18n.c-smaller-title(tag='h3') Allow browser notifications
          i18n.c-description(tag='p') Get notifications to find out what's going on when you're not on Group Income. You can turn them off anytime.
        .switch-wrapper
          input.switch(
            type='checkbox'
            name='switch'
            :checked='pushNotificationGranted'
            @change='handleNotificationSettings'
          )
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
      pushNotificationGranted: false
    }
  },
  mounted () {
    this.pushNotificationGranted = Notification?.permission === 'granted' && this.notificationEnabled
  },
  computed: {
    notificationEnabled () {
      return this.$store.state.settings.notificationEnabled
    }
  },
  methods: {
    ...mapMutations([
      'setNotificationEnabled'
    ]),
    async handleNotificationSettings (e) {
      let permission = Notification?.permission

      if (permission === 'default' && e.target.checked) {
        permission = await requestNotificationPermission(true)
      } else if (permission === 'denied') {
        alert(L('Sorry, you should reset browser notification permission again.'))
      }

      e.target.checked = this.pushNotificationGranted = e.target.checked && permission === 'granted'
      this.setNotificationEnabled(this.pushNotificationGranted)
      if (this.pushNotificationGranted) {
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
