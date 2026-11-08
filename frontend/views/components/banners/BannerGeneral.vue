<template lang='pug'>
  transition-expand
    .l-banner(
      v-if='current'
      data-test='bannerGeneral'
      :class='`is-${current.severity}`'
      aria-live='polite'
    )
      i(:class='`icon-${current.icon} is-prefix`')
      .c-banner-content(v-safe-html:a='current.message')
</template>

<script>
import TransitionExpand from '@components/TransitionExpand.vue'
import { emptyBannerSlots, pickBanner } from '@view-utils/bannerSlots.js'
import { debounce } from 'turtledash'

export default ({
  name: 'BannerGeneral',
  components: {
    TransitionExpand
  },
  data: () => ({
    ephemeral: {
      // Only the highest-priority non-empty slot is displayed (see bannerSlots.js)
      slots: emptyBannerSlots()
    }
  }),
  computed: {
    current () {
      return pickBanner(this.ephemeral.slots)
    }
  },
  methods: {
    // To be used by parent. Example:
    // this.$refs.bannerGeneral.show(L('Copied to clipboard'), 'check-circle')
    setSlot (slot: string, message: ?string, icon: string) {
      const entry = message ? { message, icon } : null
      this.ephemeral.slots[slot] = entry
      return entry
    },
    // Clears the danger and transient banners. The connection banner has a
    // single owner and can only be cleared with `cleanConnection()`.
    clean () {
      this.ephemeral.slots.danger = null
      this.ephemeral.slots.transient = null
    },
    show (message: string, icon: string) {
      return this.setSlot('transient', message, icon)
    },
    danger (message: string, icon: string) {
      return this.setSlot('danger', message, icon)
    },
    showConnection (message: string, icon: string) {
      return this.setSlot('connection', message, icon)
    },
    cleanConnection () {
      this.ephemeral.slots.connection = null
    },
    severity () {
      return this.current ? this.current.severity : ''
    },
    debouncedShow ({ message, icon, seconds, clearWhen }: {
      message: Function, icon: string, seconds: number, clearWhen: Function
    }) {
      let clearBannerTimer
      let shownEntry
      return debounce((...args) => {
        const clearBanner = () => {
          if (clearWhen()) {
            // Another caller may have replaced (or cleared) the transient
            // banner in the meantime; only remove the one shown here.
            if (shownEntry && this.ephemeral.slots.transient === shownEntry) {
              this.ephemeral.slots.transient = null
            }
            shownEntry = undefined
            clearBannerTimer = undefined
          } else {
            // after first n seconds, check every half a second for clearWhen to change
            setTimeout(clearBanner, 500)
          }
        }
        if (!clearBannerTimer && !clearWhen()) {
          shownEntry = this.show(message(...args), icon)
          clearBannerTimer = setTimeout(clearBanner, 1000 * seconds)
        }
      }, 1000 * seconds)
    }
  }
}: Object)
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.l-banner {
  display: flex;
  justify-content: center;
  align-items: flex-start;

  .c-banner-content {
    text-align: left;
    word-break: break-word;
  }
}

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
