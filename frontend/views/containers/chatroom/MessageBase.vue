<template lang='pug'>
.c-message.force-motion(
  :class='[variant, isSameSender && "same-sender", "is-type-" + type, isAlreadyPinned && "pinned"]'
  @click='$emit("wrapperAction")'
  v-touch:touchhold='longPressHandler'
  v-touch:swipe.left='reply'
)
  .c-pinned-wrapper(v-if='isAlreadyPinned')
    .c-pinned-icon
      i.icon-thumbtack
    span(v-safe-html='pinLabel')

  .c-message-wrapper
    .c-sender-or-date
      .c-time-stamp(v-if='isSameSender') {{ getTimeStamp(datetime) }}
      slot(v-else name='image')
        profile-card(:contractID='from' direction='top-left')
          avatar.c-avatar(:src='avatar' aria-hidden='true' size='md')

    .c-body
      slot(name='header')
        .c-who(v-if='!isEditing' :class='{ "sr-only": isSameSender }')
          profile-card(:contractID='from' direction='top-left')
            span.is-title-4 {{ who }}
          span.has-text-1 {{ humanDate(datetime, { hour: 'numeric', minute: 'numeric' }) }}

      slot(name='body')
        render-message-text.c-replying(
          v-if='replyingMessage'
          :isReplyingMessage='true'
          :text='replyingMessage'
          @click='$emit("reply-message-clicked")'
        )

        send-area.c-edit-send-area(
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
          :ownerID='from'
          :createdAt='datetime'
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
    :isAlreadyPinned='isAlreadyPinned'
    ref='messageAction'
    @openEmoticon='openEmoticon($event)'
    @editMessage='editMessage'
    @deleteMessage='$emit("delete-message")'
    @reply='reply'
    @retry='$emit("retry")'
    @pinToChannel='$emit("pin-to-channel")'
    @unpinFromChannel='$emit("unpin-from-channel")'
  )
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import Avatar from '@components/Avatar.vue'
import ProfileCard from '@components/ProfileCard.vue'
import emoticonsMixins from './EmoticonsMixins.js'
import MessageActions from './MessageActions.vue'
import MessageReactions from './MessageReactions.vue'
import RenderMessageText from './chat-mentions/RenderMessageText.vue'
import RenderMessageWithMarkdown from './chat-mentions/RenderMessageWithMarkdown.js'
import SendArea from './SendArea.vue'
import ChatAttachmentPreview from './file-attachment/ChatAttachmentPreview.vue'
import { humanDate, humanTimeString } from '@model/contracts/shared/time.js'
import { swapMentionIDForDisplayname } from '@model/chatroom/utils.js'
import { MESSAGE_VARIANTS } from '@model/contracts/shared/constants.js'
import { OPEN_TOUCH_LINK_HELPER } from '@utils/events.js'
import { L, LTags } from '@common/common.js'

export default ({
  name: 'MessageBase',
  mixins: [emoticonsMixins],
  components: {
    Avatar,
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
    pinnedBy: String,
    isSameSender: Boolean,
    isGroupCreator: Boolean,
    isMsgSender: Boolean,
    shouldRenderMarkdown: Boolean
  },
  computed: {
    ...mapGetters(['userDisplayNameFromID']),
    hasAttachments () {
      return Boolean(this.attachments?.length)
    },
    isAlreadyPinned () {
      return !!this.pinnedBy
    },
    pinnedUserName () {
      if (this.isAlreadyPinned) {
        if (this.currentUserID === this.pinnedBy) {
          return L('you')
        }
        return this.userDisplayNameFromID(this.pinnedBy)
      }
      return ''
    },
    pinLabel () {
      return this.isAlreadyPinned
        ? L('Pinned by {strong_}{user}{_strong}', { user: this.pinnedUserName, ...LTags('strong') })
        : ''
    }
  },
  methods: {
    humanDate,
    swapMentionIDForDisplayname,
    editMessage () {
      this.isEditing = true
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
      if (this.$refs.messageAction?.$refs?.menu) {
        this.$refs.messageAction.$refs.menu.handleTrigger()
      }
    },
    longPressHandler (e) {
      const wrappingLinkTag = e.target.closest('a.link[href]')

      if (wrappingLinkTag) {
        const url = wrappingLinkTag.getAttribute('href')
        sbp('okTurtles.events/emit', OPEN_TOUCH_LINK_HELPER, url)
        e?.preventDefault()
      } else if (!this.isEditing) {
        this.openMenu()
      }
    },
    getTimeStamp (datetime) {
      const tString = humanTimeString(datetime, { hour: '2-digit', minute: '2-digit', hour12: true })
      // Extract only numbers and colons, removing non-numeric characters like AM/PM
      const cleaned = tString.replace(/[^\d:]/g, '')
      return cleaned
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

  &.pinned {
    background-color: $warning_2;
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

      .c-time-stamp {
        opacity: 1;
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

.c-pinned-wrapper {
  color: $warning_0;
  display: flex;
  gap: 0.5rem;

  .c-pinned-icon {
    width: 2.5rem;
    text-align: right;
  }
}

.c-message-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  max-width: 100%;
}

.c-time-stamp {
  position: relative;
  display: block;
  color: $text_1;
  font-size: $size_5;
  text-align: right;
  width: 2.5rem;
  padding: 0.2rem 0.2rem 0 0;
  line-height: 1.5;
  pointer-events: none;
  user-select: none;
  opacity: 0;
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

.c-body {
  max-width: calc(100% - 2.5rem);
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
  max-width: 100%;

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

.c-edit-send-area {
  padding: 0 0 1rem;
}
</style>
