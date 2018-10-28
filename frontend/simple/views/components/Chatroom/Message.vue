<template>
  <div class="c-message is-flex" :class="[variant, isSameSender && 'sameSender']">
    <avatar :src="avatar"
      hasMargin
      size="sm"
      class="c-avatar level-left"
      :class="{ isHidden: hideAvatar }"
      aria-hidden="true"
    />
    <div>
      <span class="has-text-grey is-size-7 c-who" :class="{ 'sr-only': hideWho || isSameSender }">
        {{who}}
      </span>

      <p class="c-slot">
        <slot></slot>
      </p>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-message {
  margin: $gi-spacer $gi-spacer 0;
  align-items: flex-end;

  &.sent {
    margin-left: $gi-spacer-xl;
    flex-direction: row-reverse;
    text-align: right;
  }

  &.sameSender {
    margin-top: $gi-spacer-xs;
  }
}

.c-avatar {
  .sent & {
    margin: 0 0 0.2rem $gi-spacer-sm; // 0.2 to visually align with buble text
  }

  .isHidden &,
  .sameSender & {
    visibility: hidden;
    height: 0;
  }
}

.c-who {
  display: block;

  .sent & {
    margin-right: $gi-spacer-xs;
    margin-bottom: $gi-spacer-xs;
  }
}

.c-slot {
  max-width: 32rem;

  .sent & {
    background-color: $primary-text;
    color: $body-background-color;
    border-radius: $radius-large;
    padding: $gi-spacer-xs $gi-spacer-sm;
  }

  // When .c-shot is the only element (when .c-who isn't rendered)
  &:first-child:last-child {
    padding-bottom: $gi-spacer-sm;
  }
}
</style>
<script>
import Avatar from '../Avatar.vue'

export default {
  name: 'Message',
  components: {
    Avatar
  },
  props: {
    who: String,
    avatar: String,
    variant: {
      type: String,
      validator (value) {
        return ['sent', 'received', 'failed'].indexOf(value) !== -1
      }
    },
    isSameSender: Boolean,
    hideWho: Boolean
  },
  data () {
    return {}
  },
  computed: {
    hideAvatar () {
      return false
      /* return this.variant === 'received' */
    }
  },
  methods: {}
}
</script>
