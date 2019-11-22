<template lang='pug'>
  transition-expand
    .l-banner(v-if='ephemeral.message' data-test='bannerGeneral')
      i(:class='`icon-${ephemeral.icon} is-prefix`')
      | {{ ephemeral.message }}
</template>

<script>
import TransitionExpand from '@components/TransitionExpand.vue'

export default {
  name: 'BannerGeneral',
  components: {
    TransitionExpand
  },
  data: () => ({
    ephemeral: {
      message: null,
      icon: null
    }
  }),
  methods: {
    // To be used by parent. Example:
    // this.$refs.bannerGeneral.show('Trying to reconnect...', 'wireless')
    clean () {
      this.updateMessage('', '')
    },
    show (message, icon) {
      this.ephemeral.message = message
      this.ephemeral.icon = icon
    }
  }
}
</script>
