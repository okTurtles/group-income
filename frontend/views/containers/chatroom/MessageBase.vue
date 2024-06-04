<template lang='pug'>
.c-message(
  :class='[variant, isSameSender && "same-sender", "is-type-" + type]'
  @click='$emit("wrapperAction")'
  v-touch:touchhold='longPressHandler'
  v-touch:swipe.left='reply'
)
  .c-message-wrapper
    slot(name='image')
      profile-card(:contractID='from' direction='top-left')
        avatar.c-avatar(:src='avatar' aria-hidden='true' size='md')

    .c-body
      slot(name='header')
        .c-who(v-if='!isEditing' :class='{ "sr-only": isSameSender }')
          profile-card(:contractID='from' direction='top-left')
            span.is-title-4 {{ who }}
          span.has-text-1 {{ humanDate(datetime, { hour: 'numeric', minute: 'numeric' }) }}

      slot(name='body')
        template(v-if='replyingMessage')
          render-message-with-markdown(
            v-if='shouldRenderMarkdown'
            :isReplyingMessage='true'
            :text='replyingMessage'
            @click='$emit("reply-message-clicked")'
          )
          render-message-text.c-replying(
            v-else
            :isReplyingMessage='true'
            :text='replyingMessage'
            @click='$emit("reply-message-clicked")'
          )

        send-area(
          v-if='isEditing'
          :defaultText='swapMentionIDForDisplayname(text)'
          :isEditing='true'
          @send='onMessageEdited'
          @cancelEdit='cancelEdit'
        )
        template(v-else-if='text')
          render-message-with-markdown.c-text(
            v-if='shouldRenderMarkdown'
            :text='text'
            :edited='edited'
          )
          render-message-text.c-text(
            v-else
            :text='text'
            :edited='edited'
          )

      .c-attachments-wrapper(v-if='hasAttachments')
        chat-attachment-preview(
          :attachmentList='attachments'
          :variant='variant'
          :isForDownload='true'
          :isMsgSender='isMsgSender'
          :isGroupCreator='isGroupCreator'
          @delete-attachment='deleteAttachment'
        )

      .c-failure-message-wrapper
        i18n(tag='span') Message failed to send.
        i18n.c-failure-link(tag='span' @click='$emit("retry")') Resend message

  .c-full-width-body
    slot(name='full-width-body')

  message-reactions(
    v-if='!isEditing'
    :emoticonsList='emoticonsList'
    :messageType='type'
    :currentUserID='currentUserID'
    @selectEmoticon='selectEmoticon($event)'
    @openEmoticon='openEmoticon($event)'
  )

  message-actions(
    v-if='!isEditing'
    :variant='variant'
    :type='type'
    :text='text'
    :messageHash='messageHash'
    :isMsgSender='isMsgSender'
    :isGroupCreator='isGroupCreator'
    ref='messageAction'
    @openEmoticon='openEmoticon($event)'
    @editMessage='editMessage'
    @deleteMessage='$emit("delete-message")'
    @reply='reply'
    @retry='$emit("retry")'
  )
</template>

<script>
import sbp from '@sbp/sbp'
import Avatar from '@components/Avatar.vue'
import Tooltip from '@components/Tooltip.vue'
import ProfileCard from '@components/ProfileCard.vue'
import emoticonsMixins from './EmoticonsMixins.js'
import MessageActions from './MessageActions.vue'
import MessageReactions from './MessageReactions.vue'
import RenderMessageText from './chat-mentions/RenderMessageText.vue'
import RenderMessageWithMarkdown from './chat-mentions/RenderMessageWithMarkdown.js'
import SendArea from './SendArea.vue'
import ChatAttachmentPreview from './file-attachment/ChatAttachmentPreview.vue'
import { humanDate } from '@model/contracts/shared/time.js'
import { swapMentionIDForDisplayname } from '@model/contracts/shared/functions.js'
import {
  MESSAGE_TYPES,
  MESSAGE_VARIANTS
} from '@model/contracts/shared/constants.js'
import { OPEN_TOUCH_LINK_HELPER } from '@utils/events.js'

export default ({
  name: 'MessageBase',
  mixins: [emoticonsMixins],
  components: {
    Avatar,
    Tooltip,
    ProfileCard,
    MessageActions,
    MessageReactions,
    SendArea,
    ChatAttachmentPreview,
    RenderMessageText,
    RenderMessageWithMarkdown
  },
  data () {
    return {
      isEditing: false
    }
  },
  props: {
    height: Number,
    text: String,
    attachments: Array,
    messageHash: String,
    from: String,
    replyingMessage: String,
    who: String,
    currentUserID: String,
    avatar: [Object, String],
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
    variant: {
      type: String,
      validator (value) {
        return Object.values(MESSAGE_VARIANTS).indexOf(value) !== -1
      }
    },
    isSameSender: Boolean,
    isGroupCreator: Boolean,
    isMsgSender: Boolean,
    shouldRenderMarkdown: Boolean
  },
  computed: {
    hasAttachments () {
      return Boolean(this.attachments?.length)
    }
  },
  methods: {
    humanDate,
    swapMentionIDForDisplayname,
    editMessage () {
      if (this.type === MESSAGE_TYPES.POLL) {
        alert('TODO: implement editting a poll')
      } else {
        this.isEditing = true
      }
    },
    onMessageEdited (newMessage) {
      this.isEditing = false
      if (this.text !== newMessage) {
        this.$emit('message-edited', newMessage)
      }
    },
    deleteAttachment (manifestCid) {
      this.$emit('delete-attachment', manifestCid)
    },
    cancelEdit () {
      this.isEditing = false
    },
    reply () {
      this.$emit('reply')
    },
    selectEmoticon (emoticon) {
      this.$emit('add-emoticon', emoticon.native || emoticon)
    },
    openMenu () {
      this.$refs.messageAction.$refs.menu.handleTrigger()
    },
    longPressHandler (e) {
      const targetEl = e.target
      if (targetEl.matches('a.link[href]')) {
        const url = targetEl.getAttribute('href')
        sbp('okTurtles.events/emit', OPEN_TOUCH_LINK_HELPER, url)
      } else {
        this.openMenu()
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-message {
  padding: 0.5rem 1rem;
  scroll-margin: 20px;

  @include tablet {
    padding: 0.5rem 1.25rem;
  }
  position: relative;

  &.removed {
    background-color: $danger_2;
    opacity: 0;
    transition: opacity 0.7s ease-in-out 0.3s, background-color 0.3s ease-in;
  }

  &.pending,
  &.failed {
    .c-text {
      color: $general_0;
    }

    .c-attachments-wrapper {
      pointer-events: none;
    }
  }

  &.same-sender {
    margin-top: 0.25rem;
  }

  .button {
    flex-shrink: 0;
  }

  .c-avatar {
    max-width: unset;
  }

  &:hover {
    background-color: $general_2;

    &:not(.pending, .failed) {
      ::v-deep .c-actions {
        display: flex;
      }
    }
  }

  .c-failure-message-wrapper {
    display: none;
    margin-top: 0.25rem;
    font-weight: bold;
    font-size: 0.725rem;

    .c-failure-link {
      color: $primary_0;
      margin-left: 0.1rem;
      cursor: pointer;
      text-decoration: underline;
    }
  }

  &.failed {
    .c-failure-message-wrapper {
      display: block;
    }
  }
}

.c-message-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.c-avatar {
  .isHidden &,
  .same-sender & {
    visibility: hidden;
    height: 0;
  }
}

.c-body,
.c-full-width-body {
  width: 100%;
}

.c-who {
  display: flex;

  span {
    padding-right: 0.25rem;
  }
}

.c-text {
  word-break: break-word; // too much long words will break
  white-space: pre-line; // break \n to a new line
  margin: 0;

  // When .c-shot is the only element (when .c-who isn't rendered)
  &:first-child:last-child {
    margin-bottom: 0.5rem;
  }
}

.c-attachments-wrapper {
  position: relative;
  margin-top: 0.25rem;
}

.c-focused {
  animation: focused 1s linear 0.5s;
}

.c-disappeared {
  animation: disappeared 0.5s linear;
}
</style>
