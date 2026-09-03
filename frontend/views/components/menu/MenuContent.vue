<template lang='pug'>
.c-content(
  :class='{ "is-active": isActive, "is-height-animating": ephemeral.isHeightAnimating }'
  data-test='menuContent'
  @transitionstart='onTransitionStart'
  @transitionend='onTransitionEnd'
  @transitioncancel='onTransitionEnd'
)
  .c-content-wrapper(
    v-on-clickaway='onClickAway'
  )
    slot
</template>

<script>
import { mixin as clickaway } from 'vue-clickaway'

export default ({
  name: 'MenuOptions',
  mixins: [
    clickaway
  ],
  inject: ['Menu'],
  data () {
    return {
      ephemeral: {
        isHeightAnimating: false
      }
    }
  },
  computed: {
    isActive () {
      return this.Menu.isActive
    }
  },
  methods: {
    onTransitionStart (e) {
      // Ignore transitions bubbling up from menu items.
      if (e.target !== this.$el || e.propertyName !== 'max-height') { return }
      this.ephemeral.isHeightAnimating = true
    },
    onTransitionEnd (e) {
      // Bound this handler to `transitioncancel` as well, so interrupting the animation (e.g.
      // closing the menu mid-open) can't leave scrolling permanently disabled.
      if (e.target !== this.$el || e.propertyName !== 'max-height') { return }
      this.ephemeral.isHeightAnimating = false
    },
    onClickAway (e) {
      // Prevent closing the menu when clicking inside of the parent element,
      // except if the event was on `.c-content` (.c-responsive-menu)
      const isInsideParent = e.target !== this.$el && e.target?.closest('details') === this.$el.closest('details')
      if (!this.isActive || isInsideParent) {
        return
      }
      this.Menu.closeMenu()
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-content-wrapper {
  min-height: 100%;
}

.c-responsive-menu .c-content-wrapper {
  @include phone {
    border-radius: $radius $radius 0 0;
    background-color: $background;
    position: relative;
    z-index: 2;
    padding-bottom: 2rem;
    min-height: unset;
  }
}

.c-content {
  position: absolute;
  top: 0;
  left: 0.5rem;
  right: 0.5rem;
  z-index: 10;
  border-radius: $radius;
  background-color: $background;
  box-shadow: 0 0.5rem 1.25rem rgba(54, 54, 54, 0.3);
  max-height: 0;
  opacity: 0;
  overflow: auto;
  pointer-events: none;
  padding-bottom: 0.5rem;
  padding-top: 0.5rem;

  .is-dark-theme & {
    box-shadow: 0 0.5rem 1.25rem rgba(38, 38, 38, 0.895);
  }

  &.is-active {
    // Is that enought for every menu?
    // Should we use mask transition instead?
    pointer-events: initial;
    max-height: 25rem;
    opacity: 1;
    transition: max-height cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s 100ms, opacity cubic-bezier(0.25, 0.46, 0.45, 0.94) 300ms 100ms;
  }

  // See `onTransitionStart` - never scroll while `max-height` is animating.
  &.is-animated {
    overflow: hidden;
  }

  &.c-responsive-menu {
    @include phone {
      width: 100vw;
      height: 100%;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 0;
      margin: 0;
      border-radius: 0;
      background-color: rgba(0, 0, 0, 0.7) !important;
      display: flex;
      flex-direction: column-reverse;
      max-height: unset;
      max-width: unset;
      position: fixed;
      z-index: 40;
    }
  }

  ::v-deep .c-item {
    padding: 0;
  }

  ::v-deep .c-item-link {
    width: 100%;

    i {
      margin-right: 0.5rem;
    }
  }
}
</style>
