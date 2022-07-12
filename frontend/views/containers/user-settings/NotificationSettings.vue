<template lang='pug'>
  .settings-container
    .card
      i18n.link(
        tag='button'
        @click.prevent='requestPermission'
      ) Request Permission
</template>

<script>
import { requestNotificationPermission } from '~/frontend/utils/nativeNotification.js'
export default ({
  name: 'NotificationSettings',
  methods: {
    requestPermission () {
      requestNotificationPermission()
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.settings-container {
  @include desktop {
    padding-top: 1.5rem;
  }
}
</style>
