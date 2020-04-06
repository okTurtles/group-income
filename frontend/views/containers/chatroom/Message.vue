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
  margin: 1rem 0 0;
  align-items: flex-start;

  &.sent,
  &.failed {
    margin-left: 4rem;
    flex-direction: row-reverse;
    text-align: right;
  }

  &.sameSender {
    margin-top: 0.25rem;
  }

  &:last-of-type {
    margin-bottom: 1rem;
  }

  .button {
    flex-shrink: 0;
  }

  .c-avatar {
    margin-right: 0.5rem;
  }
}

.c-avatar,
.c-retry {
  &.alignToText {
    color: red;
    margin-top: 1rem; // visually center align to text
  }
}

.c-avatar {
  .sent &,
  .failed & {
    margin: 0 0 0 0.5rem;

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
    margin-right: 0.25rem;
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
    padding: 0.25rem 0.5rem;
  }

  .failed & {
    color: $text_1;
    border: 1px dashed $danger_0;
    border-radius: $radius-large;
    padding: 0.25rem 0.5rem;
  }

  // When .c-shot is the only element (when .c-who isn't rendered)
  &:first-child:last-child {
    margin-bottom: 0.5rem;
  }
}
</style>
