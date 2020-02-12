<template lang='pug'>
.c-message(:class='[variant, isSameSender && "sameSender"]')
  avatar.c-avatar(:src='avatar' :class='{ alignToText: !hasWhoInvisible }' aria-hidden='true' size='sm')
  .c-body
    span.has-text-1.c-who(:class='{ "gi-sr-only": hasWhoInvisible }')
      | {{who}}
    // TODO: #502 - Chat: Add support to markdown formatted text
    p.c-text(v-if='text') {{text}}
    slot(v-else='')
  button.is-icon.has-text-danger.c-retry(:class='{ alignToText: !hasWhoInvisible }' v-if='variant === "failed"' @click='$emit("retry")')
    i.icon-undo
</template>

<script>
import Avatar from '@components/Avatar.vue'

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

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-message {
  display: flex;
  margin: $spacer 0 0;
  align-items: flex-start;

  &.sent,
  &.failed {
    margin-left: $spacer-xl;
    flex-direction: row-reverse;
    text-align: right;
  }

  &.sameSender {
    margin-top: $spacer-xs;
  }

  &:last-of-type {
    margin-bottom: $spacer;
  }

  .button {
    flex-shrink: 0;
  }

  .c-avatar {
    margin-right: $spacer-sm;
  }
}

.c-avatar,
.c-retry {
  &.alignToText {
    color: red;
    margin-top: $spacer; // visually center align to text
  }
}

.c-avatar {
  .sent &,
  .failed & {
    margin: 0 0 0 $spacer-sm;

    &.alignToText {
      margin-top: 1.3rem; // visually center align to bubble text
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
    margin-right: $spacer-xs;
  }
}

.c-text {
  max-width: 32rem;
  word-wrap: break-word; // too much long words will break
  white-space: pre-line; // break \n to a new line
  margin: 0;

  .sent & {
    background-color: $primary_0;
    color: $background;
    border: 1px solid;
    border-radius: $radius-large;
    padding: $spacer-xs $spacer-sm;
  }

  .failed & {
    color: $text_1;
    border: 1px dashed $danger_0;
    border-radius: $radius-large;
    padding: $spacer-xs $spacer-sm;
  }

  // When .c-shot is the only element (when .c-who isn't rendered)
  &:first-child:last-child {
    margin-bottom: $spacer-sm;
  }
}
</style>
