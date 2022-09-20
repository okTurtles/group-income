<template lang='pug'>
.c-message(
  :class='[variant, isSameSender && "sameSender"]'
  @click='$emit("wrapperAction")'
  v-touch:touchhold='openMenu'
  v-touch:swipe.left='reply'
)
  .c-message-wrapper
    slot(name='image')
      avatar.c-avatar(:src='avatar' aria-hidden='true' size='md')

    .c-body
      slot(name='header')
        .c-who(
          v-if='!isEditing'
          :class='{ "sr-only": isSameSender }'
        )
          span.is-title-4 {{ who }}
          span.has-text-1 {{ humanDate(datetime, { hour: 'numeric', minute: 'numeric' }) }}

      slot(name='body')
        p.c-replying(
          if='replyingMessage'
          @click='onReplyMessageClicked'
        )
          template(v-for='(objReplyMessage, index) in replyMessageObjects')
            span(v-if='isText(objReplyMessage)') {{ objReplyMessage.text }}
            span.c-mention(
              v-else-if='isMention(objReplyMessage)'
              :class='{"c-mention-to-me": objReplyMessage.toMe}'
            ) {{ objReplyMessage.text }}
        send-area(
          v-if='isEditing'
          :defaultText='text'
          :isEditing='true'
          @send='onMessageEdited'
          @cancelEdit='cancelEdit'
        )

        p.c-text(v-else-if='text')
          template(v-for='(objText, index) in textObjects')
            span(v-if='isText(objText)') {{ objText.text }}
            span.c-mention(
              v-else-if='isMention(objText)'
              :class='{"c-mention-to-me": objText.toMe}'
            ) {{ objText.text }}
          i18n.c-edited(v-if='edited') (edited)

  message-reactions(
    v-if='!isEditing'
    :emoticonsList='emoticonsList'
    :currentUsername='currentUsername'
    @selectEmoticon='selectEmoticon($event)'
    @openEmoticon='openEmoticon($event)'
  )

  message-actions(
    v-if='!isEditing'
    :variant='variant'
    :type='type'
    :isCurrentUser='isCurrentUser'
    ref='messageAction'
    @openEmoticon='openEmoticon($event)'
    @editMessage='editMessage'
    @deleteMessage='deleteMessage'
    @reply='reply'
    @retry='retry'
    @copyToClipBoard='copyToClipBoard'
  )
</template>

<script>
import { mapGetters } from 'vuex'
import Avatar from '@components/Avatar.vue'
import emoticonsMixins from './EmoticonsMixins.js'
import MessageActions from './MessageActions.vue'
import MessageReactions from './MessageReactions.vue'
import SendArea from './SendArea.vue'
import { humanDate } from '@model/contracts/shared/time.js'
import { makeMentionFromUsername } from '@model/contracts/shared/functions.js'

const TextObjectType = { Text: 'TEXT', Mention: 'MENTION' }
export default ({
  name: 'MessageBase',
  mixins: [emoticonsMixins],
  components: {
    Avatar,
    MessageActions,
    MessageReactions,
    SendArea
  },
  data () {
    return {
      isEditing: false
    }
  },
  props: {
    text: String,
    replyingMessage: String,
    who: String,
    currentUsername: String,
    avatar: String,
    datetime: {
      type: Date,
      required: true
    },
    edited: Boolean,
    notification: Object,
    type: String,
    emoticonsList: {
      type: Object,
      default: null
    },
    variant: String,
    isSameSender: Boolean,
    isCurrentUser: Boolean
  },
  computed: {
    ...mapGetters(['chatRoomUsers', 'ourUsername']),
    textObjects () {
      if (!this.text.includes('@')) {
        return [{ type: TextObjectType.Text, text: this.text }]
      }
      const possibleMentions = [
        ...Object.keys(this.chatRoomUsers).map(u => makeMentionFromUsername(u).me),
        makeMentionFromUsername('').all
      ]

      return this.text
        .split(new RegExp(`(${possibleMentions.join('|')})`))
        .map(t => possibleMentions.includes(t)
          ? { type: TextObjectType.Mention, text: t }
          : { type: TextObjectType.Text, text: t }
        )
    },
    replyMessageObjects () {
      if (!this.replyingMessage) {
        return []
      } else if (!this.replyingMessage.includes('@')) {
        return [{ type: TextObjectType.Text, text: this.replyingMessage }]
      }
      const possibleMentions = [
        ...Object.keys(this.chatRoomUsers).map(u => makeMentionFromUsername(u).me),
        makeMentionFromUsername('').all
      ]

      return this.replyingMessage
        .split(new RegExp(`(${possibleMentions.join('|')})`))
        .map(t => possibleMentions.includes(t)
          ? { type: TextObjectType.Mention, text: t }
          : { type: TextObjectType.Text, text: t }
        )
    }
  },
  methods: {
    humanDate,
    editMessage () {
      this.isEditing = true
    },
    onReplyMessageClicked () {
      this.$emit('reply-message-clicked')
    },
    onMessageEdited (newMessage) {
      this.isEditing = false
      if (this.text !== newMessage) {
        this.$emit('message-edited', newMessage)
      }
    },
    deleteMessage () {
      this.$emit('delete-message')
    },
    cancelEdit () {
      this.isEditing = false
    },
    reply () {
      this.$emit('reply')
    },
    copyToClipBoard () {
      navigator.clipboard.writeText(this.text)
    },
    selectEmoticon (emoticon) {
      this.$emit('add-emoticon', emoticon.native || emoticon)
    },
    retry () {
      this.$emit('retry')
    },
    openMenu () {
      this.$refs.messageAction.$refs.menu.handleTrigger()
    },
    isText (o) {
      return o.type === TextObjectType.Text
    },
    isMention (o) {
      return o.type === TextObjectType.Mention
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-message {
  padding: 0.5rem 1rem;

  @include tablet {
    padding: 0.5rem 2.5rem;
  }
  position: relative;
  max-height: 100%;

  &.removed {
    background-color: $danger_2;
    opacity: 0;
    transition: opacity 0.7s ease-in-out 0.3s, background-color 0.3s ease-in;
  }

  &.pending {
    .c-text {
      color: $general_0;
    }
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
  width: 100%;
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

.c-focused {
  animation: focused 1s linear 0.5s;
}

.c-replying {
  border-left: 2px;
  border-color: #dbdbdb; // var(--text_1);
  border-style: none none none solid;
  font-size: 0.75rem;
  color: var(--text_1);
  font-style: italic;
  padding-left: 0.25rem;

  &:hover {
    cursor: pointer;
    color: var(--text_2);
    border-color: var(--text_1); // var(--text_2);
  }

  & .c-mention {
    background-color: transparent;
  }
}

.c-edited {
  margin-left: 0.2rem;
  font-size: 0.7rem;
  color: var(--text_1);
}

.c-mention {
  background-color: $primary_2;
  color: $primary_0;
  padding: 0 0.1rem;
}

.c-mention.c-mention-to-me {
  background-color: $warning_1;
  // background-color: #f2c74466;
}
</style>
