<template lang='pug'>
.c-message(:class='[variant, isSameSender && "sameSender"]' @click='$emit("wrapperAction")')
  .c-message-wrapper
    slot(name='image')
      avatar.c-avatar(:src='avatar' aria-hidden='true' size='md')

    .c-body
      slot(name='header')
        .c-who(:class='{ "sr-only": isSameSender }')
          span.is-title-4 {{who}}
          span.has-text-1 {{getTime(time)}}

      slot(name='body')
        p.c-text(v-if='text') {{text}}

  message-reactions(
    :emoticonsList='emoticonsList'
    @selectEmoticon='selectEmoticon($event)'
    @openEmoticon='openEmoticon($event)'
  )

  message-actions(
    :variant='variant'
    :isCurrentUser='isCurrentUser'
    @openEmoticon='openEmoticon($event)'
    @edit='edit'
    @reply='reply'
    @retry='retry'
    @moreOptions='moreOptions'
    @copyToClipBoard='copyToClipBoard'
    @deleteMessage='deleteMessage'
  )
</template>

<script>
import Avatar from '@components/Avatar.vue'
import { getTime } from '@utils/time.js'
import emoticonsMixins from './EmoticonsMixins.js'
import MessageActions from './MessageActions.vue'
import MessageReactions from './MessageReactions.vue'

export default {
  name: 'MessageBase',
  mixins: [emoticonsMixins],
  components: {
    Avatar,
    MessageActions,
    MessageReactions
  },
  props: {
    text: String,
    who: String,
    currentUserId: String,
    avatar: String,
    time: {
      type: Date,
      required: true
    },
    emoticonsList: {
      type: Object,
      default: null
    },
    variant: String,
    isSameSender: Boolean,
    isCurrentUser: Boolean
  },
  methods: {
    getTime,
    edit () {
      console.log('TODO EDIT')
    },
    reply () {
      this.$emit('reply')
    },
    moreOptions () {
      console.log('TODO MORE OPTIONS')
    },
    copyToClipBoard () {
      navigator.clipboard.writeText(this.text)
    },
    selectEmoticon (emoticon) {
      this.$emit('addEmoticon', emoticon.native || emoticon)
    },
    retry () {
      this.$emit('retry')
    },
    deleteMessage () {
      this.$emit('deleteMessage')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-message {
  padding: 0.5rem 2.5rem;
  position: relative;
  max-height: 100%;

  &.removed {
    background-color: $danger_2;
    opacity: 0;
    transition: opacity 0.7s ease-in-out 0.3s, background-color 0.3s ease-in;
  }

  &.sameSender {
    margin-top: 0.25rem;
  }

  .button {
    flex-shrink: 0;
  }

  .c-avatar {
    margin-right: 0.5rem;
  }

  &:hover {
    background-color: $general_2;
    ::v-deep .c-actions {
      display: flex;
    }
  }
}

.c-message-wrapper {
  display: flex;
  align-items: flex-start;
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
