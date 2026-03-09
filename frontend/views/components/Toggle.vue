<template lang='pug'>
button.c-toggle.is-unstyled(
  :class='element'
  @click='$emit("toggle")'
  :aria-label='L("Toggle navigation")'
)
  i(:class='iconClasses')
    slot
    badge(v-if='showChatNotification') {{ currentGroupUnreadMessagesCount }}
</template>

<script>
import Badge from './Badge.vue'
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'Toggle',
  components: {
    Badge
  },
  props: {
    element: {
      type: String,
      validator: (value) => ['navigation', 'sidebar', 'chat'].includes(value),
      required: true
    },
    showBadge: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapState(['currentGroupId']),
    ...mapGetters([
      'groupUnreadMessages'
    ]),
    currentGroupUnreadMessagesCount () {
      return !this.currentGroupId ? 0 : this.groupUnreadMessages(this.currentGroupId)
    },
    showChatNotification () {
      return this.element === 'chat' &&
        this.showBadge &&
        this.currentGroupUnreadMessagesCount
    },
    iconClasses () {
      const nameMap = {
        navigation: 'bars',
        sidebar: 'info',
        chat: 'comment'
      }

      return [
        `icon-${nameMap[this.element] || 'info'} c-toggle-icon`,
        { 'c-toggle-bg': this.showChatNotification }
      ]
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
@import "@assets/style/_mixins.scss";

$speed: 300ms;
$iconSize: 2.75rem;

.c-toggle {
  @extend %reset-button;
  height: 4rem;
  position: absolute;
  top: 0;
  padding: 0.5rem 0;
  width: 2rem + $iconSize; // Gap on the edge.
  background-color: transparent;
  transition: height 1ms $speed, width 1ms $speed, background $speed * 0.5;
  overflow: hidden;
  color: $text_0;

  // Similar to `.button.is-icon` but adapted to a "corner" button.
  &:hover,
  &:focus {
    .c-toggle-icon {
      background-color: $general_1;
    }
  }

  &:focus {
    .c-toggle-icon {
      box-shadow: 0 0 0 2px $primary_1;
    }
  }

  &.navigation {
    text-align: right;
  }

  &.sidebar {
    text-align: left;
  }

  .c-toggle-icon {
    position: relative; // Allow the badge to be anchored to the icon rather than to the button.
    border-radius: 50%;
    width: $iconSize;
    height: $iconSize;
    text-align: center;
    line-height: $iconSize;
    transition: opacity $speed * 0.5 $speed;

    &.c-toggle-bg {
      background-color: var(--general_1);
    }
  }

  .is-active & {
    background-color: rgba(0, 0, 0, 0.7);
    height: 100%;
    width: 200vw;
    top: 0;
    transition: height 1ms 1ms, width 1ms 1ms, background $speed * 0.5;

    .c-toggle-icon {
      transition: opacity 1ms 1ms;
      opacity: 0;
    }
  }

  @include tablet {
    width: 3rem + $iconSize;
  }

  @include desktop {
    display: none;
  }
}
</style>
