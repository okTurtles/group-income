<template lang='pug'>
.c-message(:class='[variant, isSameSender && "sameSender"]')
  avatar.c-avatar(:src='avatar' aria-hidden='true' size='md')
  .c-body
    .c-who(:class='{ "gi-sr-only": hasWhoInvisible }')
      span.is-title-4 {{who}}
      span.has-text-1 {{getTime(time)}}

    // TODO: #502 - Chat: Add support to markdown formatted text
    p.c-text(v-if='text') {{text}}

  button.is-icon.has-text-danger.c-retry(:class='{ alignToText: !hasWhoInvisible }' v-if='variant === "failed"' @click='$emit("retry")')
    i.icon-undo
</template>

<script>
import Avatar from '@components/Avatar.vue'
import { getTime } from '@utils/time.js'

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
    time: Date,
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
  },
  methods: {
    getTime
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-message {
  display: flex;
  margin: 1rem 0 0;
  align-items: flex-start;

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

  span {
    padding-right: 0.25rem;
  }
}

.c-text {
  max-width: 32rem;
  word-wrap: break-word; // too much long words will break
  white-space: pre-line; // break \n to a new line
  margin: 0;

  // When .c-shot is the only element (when .c-who isn't rendered)
  &:first-child:last-child {
    margin-bottom: 0.5rem;
  }
}
</style>
