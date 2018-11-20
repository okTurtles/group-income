<template>
  <div class="c-message is-flex" :class="[variant, isSameSender && 'sameSender']">
    <avatar :src="avatar"
      hasMargin
      size="sm"
      class="c-avatar level-left"
      :class="{ 'alignToText': !hasWhoInvisible }"
      aria-hidden="true"
    />
    <div class="c-body">
      <span class="has-text-text-light is-size-7 c-who" :class="{ 'sr-only': hasWhoInvisible }">
        {{who}}
      </span>
      <!-- TODO: #502 - Chat: Add support to markdown formatted text -->
      <p class="c-text" v-if="text">{{text}}</p>
      <slot v-else></slot>
    </div>
    <button class="button is-icon has-text-danger c-retry"
      :class="{ 'alignToText': !hasWhoInvisible }"
      v-if="variant === 'failed'"
      @click="$emit('retry')"
    >
      <i class="fa fa-undo"></i>
    </button>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-message {
  margin: $gi-spacer $gi-spacer-sm 0;
  align-items: flex-start;

  &.sent,
  &.failed {
    margin-left: $gi-spacer-xl;
    flex-direction: row-reverse;
    text-align: right;
  }

  &.sameSender {
    margin-top: $gi-spacer-xs;
  }

  &:last-of-type {
    margin-bottom: $gi-spacer;
  }

  .button {
    flex-shrink: 0;
  }

  @include phablet {
    margin: $gi-spacer $gi-spacer 0;
  }
}

.c-avatar,
.c-retry {
  &.alignToText {
    color: red;
    margin-top: $gi-spacer; // visually center align to text
  }
}

.c-avatar {
  .sent &,
  .failed & {
    margin: 0 0 0 $gi-spacer-sm;

    &.alignToText {
      margin-top: 1.4rem; // visually center align to bubble text
    }
  }

  .isHidden &,
  .sameSender & {
    visibility: hidden;
    height: 0;
  }
}

.c-body {
  max-width: 100%;
}

.c-who {
  display: block;

  .sent &,
  .failed & {
    margin-right: $gi-spacer-xs;
  }
}

.c-text {
  max-width: 32rem;
  word-wrap: break-word; // too much long words will break
  white-space: pre-line; // break \n to a new line

  .sent & {
    background-color: $primary-text;
    color: $body-background-color;
    border: 1px solid;
    border-radius: $radius-large;
    padding: $gi-spacer-xs $gi-spacer-sm;
  }

  .failed & {
    color: $text-light;
    border: 1px dashed $danger;
    border-radius: $radius-large;
    padding: $gi-spacer-xs $gi-spacer-sm;
  }

  // When .c-shot is the only element (when .c-who isn't rendered)
  &:first-child:last-child {
    margin-bottom: $gi-spacer-sm;
  }
}
</style>
<script>
import Avatar from '../Avatar.vue'

const variants = {
  SENT: 'sent',
  RECEIVED: 'received',
  FAILED: 'failed'
}

export default {
  name: 'Message',
  components: {
    Avatar
  },
  props: {
    text: String,
    who: String,
    avatar: String,
    variant: {
      type: String,
      validator (value) {
        return [variants.SENT, variants.RECEIVED, variants.FAILED].indexOf(value) !== -1
      }
    },
    isSameSender: Boolean,
    hideWho: Boolean
  },
  constants: Object.freeze({
    variants
  }),
  computed: {
    hasWhoInvisible () {
      return this.hideWho || this.isSameSender
    }
  }
}
</script>
