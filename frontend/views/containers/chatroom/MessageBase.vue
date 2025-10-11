<template lang='pug'>
.c-message.force-motion(
  :class='componentRootClasses'
  @click='$emit("wrapperAction")'
  @mouseleave='mouseLeave'
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

    .c-body(
      ref='msgBody'
      :class='{ "is-truncated": isMessageCropped }'
    )
      slot(name='header')
        .c-who(v-if='!isEditing' :class='{ "sr-only": isSameSender }')
          profile-card(:contractID='from' direction='top-left')
            span.c-username.is-title-4(:title='who') {{ who }}
          span.c-datetime.has-text-1 {{ humanDate(datetime, { hour: 'numeric', minute: 'numeric' }) }}

      slot(name='body')
        render-message-text.c-replying(
          v-if='replyingMessage'
          :isReplyingMessage='true'
          :text='replyingMessage'
          @click='$emit("reply-message-clicked")'
        )

        send-area.c-edit-send-area(
          v-if='isEditing && text'
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
          @image-attachments-render-complete='determineToEnableTruncationToggle'
        )

      .c-failure-message-wrapper
        i18n(tag='span') Message failed to send.
        i18n.c-failure-link(tag='span' @click='$emit("retry")') Resend message

  .c-full-width-body(
    ref='msgFullWidthBody'
    :class='{ "is-truncated": isMessageCropped }'
  )
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
    @markAsUnread='markAsUnread'
  )

  .c-truncate-toggle-container(
    v-if='!isEditing && ephemeral.truncateToggle.enabled'
    :class='{ "should-indent": isTypeText }'
  )
    button.is-unstyled.c-truncate-toggle(
      :class='{ "is-showing": ephemeral.truncateToggle.isShowingAll }'
      type='button'
      @click.stop='toggleMessageTruncation'
    )
      i18n.c-btn-text(v-if='ephemeral.truncateToggle.isShowingAll') Show less
      i18n.c-btn-text(v-else) Show more
      i.icon-angle-down
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
import { MESSAGE_TYPES, MESSAGE_VARIANTS } from '@model/contracts/shared/constants.js'
import {
  CHAT_LONG_MESSAGE_HEIGHT_THRESHOLD_MOBILE,
  CHAT_LONG_MESSAGE_HEIGHT_THRESHOLD_DESKTOP
} from '~/frontend/utils/constants.js'
import { OPEN_TOUCH_LINK_HELPER } from '@utils/events.js'
import { L, LTags } from '@common/common.js'
import { getFileType } from '@view-utils/filters.js'

export default ({
  name: 'MessageBase',
  mixins: [emoticonsMixins],
  inject: [
    'chatMainConfig',
    'chatMainUtils'
  ],
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
      ephemeral: {
        truncateToggle: {
          enabled: false,
          isShowingAll: false
        }
      }
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
    updatedDate: {
      type: String,
      required: false
    },
    edited: Boolean,
    isEditing: Boolean,
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
    isFocused: Boolean,
    shouldRenderMarkdown: Boolean
  },
  computed: {
    ...mapGetters(['userDisplayNameFromID']),
    componentRootClasses () {
      return [
        this.variant,
        'is-type-' + this.type,
        {
          'same-sender': this.isSameSender,
          'pinned': this.isAlreadyPinned,
          'has-truncate-toggle': this.ephemeral.truncateToggle.enabled,
          'truncate-toggle__showing-all': this.ephemeral.truncateToggle.isShowingAll,
          'c-focused': this.isFocused
        }
      ]
    },
    hasAttachments () {
      return Boolean(this.attachments?.length)
    },
    hasImageAttachment () {
      return Array.isArray(this.attachments) &&
        this.attachments.some(attachment => getFileType(attachment.mimeType) === 'image')
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
    },
    isTypeText () {
      return this.type === MESSAGE_TYPES.TEXT
    },
    isTypePoll () {
      return this.type === MESSAGE_TYPES.POLL
    },
    shouldCheckToTruncate () {
      // Should check if the message content is long enough to display 'show more/less' toggle button
      return this.isTypeText || this.isTypePoll
    },
    isMessageCropped () {
      // Check if the truncate-toggle is enabled and the message is folded.
      return this.ephemeral.truncateToggle.enabled && !this.ephemeral.truncateToggle.isShowingAll
    }
  },
  methods: {
    humanDate,
    swapMentionIDForDisplayname,
    mouseLeave () {
      if (this.$refs.messageAction?.$refs?.menu && this.$refs.messageAction.$refs.menu.isActive) {
        this.$refs.messageAction.$refs.menu.closeMenu()
      }
    },
    editMessage () {
      this.$emit('message-is-editing', true)
    },
    onMessageEdited (newMessage) {
      if (this.text !== newMessage) {
        this.$emit('message-edited', newMessage)

        // The truncate-toggle is re-calculated after message-edition is processed. So resetting the relevant states here.
        this.ephemeral.truncateToggle.enabled = false
        this.ephemeral.truncateToggle.isShowingAll = false
      } else {
        this.$emit('message-is-editing', false)
      }
    },
    deleteAttachment (manifestCid) {
      this.$emit('delete-attachment', manifestCid)
    },
    cancelEdit () {
      this.$emit('message-is-editing', false)
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
    },
    determineToEnableTruncationToggle () {
      const msgBodyEl = this.isTypePoll
        ? this.$refs.msgFullWidthBody // poll message is rendered in .c-full-width-body container
        : this.$refs.msgBody
      const threshold = this.chatMainConfig.isPhone
        ? CHAT_LONG_MESSAGE_HEIGHT_THRESHOLD_MOBILE
        : CHAT_LONG_MESSAGE_HEIGHT_THRESHOLD_DESKTOP

      if (msgBodyEl) {
        // If the truncate-toggle is already displayed and the message is folded,
        // we should use scrollHeight value for the check instead of clientHeight.
        const height = this.isMessageCropped ? msgBodyEl.scrollHeight : msgBodyEl.clientHeight
        const prevEnabled = this.ephemeral.truncateToggle.enabled

        this.ephemeral.truncateToggle.enabled = height > threshold
        if (prevEnabled !== this.ephemeral.truncateToggle.enabled) {
          // If 'enabled' is changed, should initialize 'isShowingAll'.
          this.ephemeral.truncateToggle.isShowingAll = false
        }
      }
    },
    toggleMessageTruncation (e) {
      const currentValue = this.ephemeral.truncateToggle.isShowingAll
      this.ephemeral.truncateToggle.isShowingAll = !currentValue

      if (currentValue) {
        // When folding the expanded message, scroll to the message so that it stays in the screen.
        this.$el.scrollIntoView({ behavior: 'instant' })
      }
    },
    markAsUnread () {
      this.chatMainUtils.markAsUnread({
        messageHash: this.messageHash,
        createdHeight: this.height
      })
    }
  },
  watch: {
    'chatMainConfig.isPhone' () {
      if (this.shouldCheckToTruncate) {
        this.determineToEnableTruncationToggle()
      }
    },
    updatedDate (newVal) {
      if (newVal && this.shouldCheckToTruncate) {
        // When the messge is edited, check again if truncate-toggle is needed.
        this.$nextTick(() => {
          this.determineToEnableTruncationToggle()
        })
      }
    }
  },
  mounted () {
    if (
      this.shouldCheckToTruncate &&
      // NOTE: If the message has any image attached, defer this check until the <img /> DOMs are rendered.
      //       (which is detected via 'image-attachments-render-complete' custom event in ChatAttachmentPreview.vue)
      !this.hasImageAttachment
    ) {
      this.determineToEnableTruncationToggle()
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

  &.failed {
    .c-failure-message-wrapper {
      display: block;
    }
  }

  &:hover, &:has(.c-menu .is-active) {
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

  .button {
    flex-shrink: 0;
  }

  .c-avatar {
    max-width: unset;
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
  max-width: calc(100% - 2.75rem);
}

.c-who {
  display: flex;
  width: 100%;

  ::v-deep .c-twrapper {
    width: auto;
    overflow: hidden;
  }

  .c-username {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .c-datetime {
    flex-shrink: 0;
  }

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

// message-truncation related styles

.c-message.has-truncate-toggle {
  padding-bottom: 2.25rem;

  .c-body,
  .c-full-width-body {
    &.is-truncated {
      max-height: 420px; // Using px instead of rem here to make it independent of the 'font-size' setting in the user-settings.
      overflow-y: hidden;
    }
  }

  .c-truncate-toggle-container {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2.25rem;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    padding-left: 1rem;
    padding-bottom: 0.5rem;
    pointer-events: none;

    @include tablet {
      padding-left: 3.5rem;
    }

    &.should-indent {
      padding-left: 4.25rem;
    }

    button.c-truncate-toggle {
      z-index: 1;
      pointer-events: initial;
      color: $primary_0;
      font-size: $size_5;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      column-gap: 6px;

      i {
        font-size: 1.15em;
      }

      &:hover,
      &:focus,
      &:focus-within {
        .c-btn-text {
          text-decoration: underline;
        }
      }

      &.is-showing {
        i {
          transform: rotate(180deg);
        }
      }
    }
  }
}
</style>
