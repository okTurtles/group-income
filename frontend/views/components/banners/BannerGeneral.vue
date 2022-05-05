<template lang='pug'>
  transition-expand
    .l-banner(
      v-if='ephemeral.message'
      data-test='bannerGeneral'
      :class='`is-${ephemeral.severity}`'
      aria-live='polite'
    )
      i(:class='`icon-${ephemeral.icon} is-prefix`')
      span(v-safe-html:a='ephemeral.message')
</template>

<script>
import TransitionExpand from '@components/TransitionExpand.vue'
import { debounce } from '@utils/giLodash.js'

export default ({
  name: 'BannerGeneral',
  components: {
    TransitionExpand
  },
  data: () => ({
    ephemeral: {
      message: null,
      icon: null,
      severity: null
    }
  }),
  methods: {
    // To be used by parent. Example:
    // this.$refs.bannerGeneral.show(L('Trying to reconnect...'), 'wifi')
    clean () {
      this.ephemeral.message = ''
      this.ephemeral.icon = ''
      this.ephemeral.severity = ''
    },
    show (message, icon) {
      this.ephemeral.message = message
      this.ephemeral.icon = icon
      this.ephemeral.severity = 'neutral'
    },
    danger (message, icon) {
      this.ephemeral.message = message
      this.ephemeral.icon = icon
      this.ephemeral.severity = 'danger'
    },
    severity () {
      return this.ephemeral.severity
    },
    debouncedShow ({ message, icon, seconds, clearWhen }: {
      message: Function, icon: string, seconds: number, clearWhen: Function
    }) {
      let clearBannerTimer
      return debounce((...args) => {
        const clearBanner = () => {
          if (clearWhen()) {
            if (this.severity() !== 'danger') {
              this.clean()
            }
            clearBannerTimer = undefined
          } else {
            // after first n seconds, check every half a second for clearWhen to change
            setTimeout(clearBanner, 500)
          }
        }
        if (!clearBannerTimer && !clearWhen()) {
          this.show(message(...args), icon)
          clearBannerTimer = setTimeout(clearBanner, 1000 * seconds)
        }
      }, 1000 * seconds)
    }
  }
}: Object)
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.l-banner ::v-deep .link {
  color: inherit;
  border-bottom-color: inherit;
  font-weight: inherit;
}

.is-neutral {
  background-color: $text_0;
  color: $background;
}

.is-danger {
  background-color: $danger_0;
  color: $background;
}
</style>
