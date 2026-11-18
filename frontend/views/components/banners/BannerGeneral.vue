<template lang='pug'>
  transition-expand
    .l-banner(
      v-if='current'
      data-test='bannerGeneral'
      :class='`is-${current.severity}`'
    )
      i(:class='`icon-${current.icon} is-prefix`')
      .c-banner-content(v-safe-html:a='current.message')
</template>

<script>
import TransitionExpand from '@components/TransitionExpand.vue'
import { clearSlots, emptyBannerSlots, pickBanner, setSlot } from '@view-utils/bannerSlots.js'
import type { DisplayedBanner } from '@view-utils/bannerSlots.js'
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
  watch: {
    // The live region is in index.html, always rendered: this banner is only
    // rendered while there is a message, and a live region inserted together
    // with its content often isn't announced. It gets the message as text
    // (`DOMParser` runs no scripts and loads nothing).
    current (current: ?DisplayedBanner) {
      const text = current
        ? new DOMParser().parseFromString(current.message, 'text/html').body?.textContent || ''
        : ''
      this.$emit('announce', text)
    }
  },
  methods: {
    // Clears the danger slot (`gi.ui/clearBanner`). The connection and sync
    // banners are only cleared by their owners, through `clearConnection()`
    // and `debouncedShow`.
    clean () {
      clearSlots(this.ephemeral.slots)
    },
    // A transient banner (used by `debouncedShow`). Short confirmations such as
    // 'Copied to clipboard' are toasts (`gi.ui/toast`)
    show (message: string, icon: string) {
      return setSlot(this.ephemeral.slots, 'transient', message, icon)
    },
    danger (message: string, icon: string) {
      return setSlot(this.ephemeral.slots, 'danger', message, icon)
    },
    showConnection (message: string, icon: string) {
      return setSlot(this.ephemeral.slots, 'connection', message, icon)
    },
    clearConnection () {
      setSlot(this.ephemeral.slots, 'connection', null, '')
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
            if (shownEntry) clearSlots(this.ephemeral.slots, shownEntry)
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
