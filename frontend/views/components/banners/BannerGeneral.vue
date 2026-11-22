<template lang='pug'>
  transition-expand
    .l-banner(
      v-if='current'
      data-test='bannerGeneral'
      :class='`is-${current.severity}`'
    )
      i(:class='`icon-${current.icon} is-prefix`')
      .c-banner-content(v-safe-html:a='current.message')
      //- A real button: focusable and announced as one. Inactive while its
      //- action runs, for at least `config.actionMinBusy`, so that a double
      //- click runs it once. `aria-disabled` (with the guard in `runAction`)
      //- rather than `disabled`: a focused button that becomes disabled loses
      //- focus to the body, and keyboard and screen reader users their place.
      button.is-unstyled.is-link-inherit.c-banner-action(
        v-if='current.action'
        type='button'
        data-test='bannerAction'
        :aria-disabled='ephemeral.actionRunning'
        @click='runAction'
      ) {{ current.action.label }}
</template>

<script>
import TransitionExpand from '@components/TransitionExpand.vue'
import { clearSlots, emptyBannerSlots, pickBanner, setSlot } from '@view-utils/bannerSlots.js'
// TODO: use the banner types from bannerSlots.js after the Vue 3 migration
import { debounce } from 'turtledash'

export default {
  name: 'BannerGeneral',
  components: {
    TransitionExpand
  },
  data: () => ({
    config: {
      actionMinBusy: 1000
    },
    ephemeral: {
      // Only the highest-priority non-empty slot is displayed (see bannerSlots.js)
      slots: emptyBannerSlots(),
      actionRunning: false,
      actionMinBusyTimer: null
    }
  }),
  computed: {
    current () {
      return pickBanner(this.ephemeral.slots)
    }
  },
  beforeDestroy () {
    clearTimeout(this.ephemeral.actionMinBusyTimer)
  },
  watch: {
    // The live region is in index.html, always rendered: this banner is only
    // rendered while there is a message, and a live region inserted together
    // with its content often isn't announced. It gets the message as text
    // (`DOMParser` runs no scripts and loads nothing), without the action's
    // label: the button is announced when it's reached.
    current (current) {
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
    show (message, icon) {
      return setSlot(this.ephemeral.slots, 'transient', message, icon)
    },
    danger (message, icon) {
      return setSlot(this.ephemeral.slots, 'danger', message, icon)
    },
    showConnection (message, icon, action) {
      return setSlot(this.ephemeral.slots, 'connection', message, icon, action)
    },
    clearConnection () {
      setSlot(this.ephemeral.slots, 'connection', null, '')
    },
    async runAction () {
      const action = this.current?.action
      if (!action || this.ephemeral.actionRunning) return
      this.ephemeral.actionRunning = true
      try {
        await Promise.all([
          // `run()` throwing is a rejection
          new Promise(resolve => resolve(action.run())).catch((e) => {
            console.error('[BannerGeneral] Error running the banner action', e)
          }),
          new Promise(resolve => {
            this.ephemeral.actionMinBusyTimer = setTimeout(resolve, this.config.actionMinBusy)
          })
        ])
      } finally {
        this.ephemeral.actionMinBusyTimer = null
        this.ephemeral.actionRunning = false
      }
    },
    debouncedShow ({ message, icon, seconds, clearWhen }) {
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
}
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

  // The banner's colors, which contrast with its background, instead of the
  // link's hover color
  .c-banner-action {
    flex-shrink: 0;
    margin-left: 0.75rem;
    font-weight: inherit;
    line-height: inherit;

    &:hover,
    &:focus {
      color: inherit;
      border-bottom: none;
    }

    // `.is-unstyled` removes the focus outline
    &:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 2px;
    }

    // While its action runs (see the template). Still focusable, with the
    // focus outline.
    &[aria-disabled="true"] {
      opacity: 0.7;
      cursor: wait;
    }
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
