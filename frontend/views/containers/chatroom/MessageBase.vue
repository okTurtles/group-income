<template lang='pug'>
.c-message(
  :class='[variant, isSameSender && "same-sender", "is-type-" + type]'
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
          v-if='replyingMessage'
          @click='$emit("reply-message-clicked")'
        )
          template(v-for='(objReplyMessage, index) in replyMessageObjects')
            span.custom-markdown-content(
              v-if='isText(objReplyMessage)'
              v-safe-html:a='objReplyMessage.text'
            )
            span.c-member-mention(
              v-else-if='isMemberMention(objReplyMessage)'
              :class='{"c-mention-to-me": objReplyMessage.toMe}'
            ) {{ objReplyMessage.text }}
            span.c-channel-mention(
              v-else-if='isChannelMention(objReplyMessage)'
              :tabindex='objReplyMessage.disabled ? undefined : 0'
              :class='{ "is-disabled": objReplyMessage.disabled }'
              @click='navigateToChatroom(objReplyMessage)'
              @keyup.enter='navigateToChatroom(objReplyMessage)'
            )
              i(:class='"icon-" + objText.icon')
              span {{ objText.text }}
        send-area(
          v-if='isEditing'
          :defaultText='swapMentionIDForDisplayname(text)'
          :isEditing='true'
          @send='onMessageEdited'
          @cancelEdit='cancelEdit'
        )

        p.c-text(v-else-if='text')
          template(v-for='objText in textObjects')
            span.custom-markdown-content(
              v-if='isText(objText)'
              v-safe-html:a='objText.text'
            )
            span.c-member-mention(
              v-else-if='isMemberMention(objText)'
              :class='{"c-mention-to-me": objText.toMe}'
            ) {{ objText.text }}
            span.c-channel-mention(
              v-else-if='isChannelMention(objText)'
              :tabindex='objText.disabled ? undefined : 0'
              :class='{ "is-disabled": objText.disabled }'
              @click='navigateToChatroom(objText)'
              @keyup.enter='navigateToChatroom(objText)'
            )
              i(:class='"icon-" + objText.icon')
              span {{ objText.text }}
          i18n.c-edited(v-if='edited') (edited)

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
    :isMsgSender='isMsgSender'
    ref='messageAction'
    @openEmoticon='openEmoticon($event)'
    @editMessage='editMessage'
    @deleteMessage='$emit("delete-message")'
    @reply='reply'
    @retry='$emit("retry")'
    @copyMessageLink='copyMessageLink'
  )
</template>

<script>
import { mapGetters } from 'vuex'
import Avatar from '@components/Avatar.vue'
import Tooltip from '@components/Tooltip.vue'
import emoticonsMixins from './EmoticonsMixins.js'
import MessageActions from './MessageActions.vue'
import MessageReactions from './MessageReactions.vue'
import SendArea from './SendArea.vue'
import ChatAttachmentPreview from './file-attachment/ChatAttachmentPreview.vue'
import { humanDate } from '@model/contracts/shared/time.js'
import { makeMentionFromUserID, swapMentionIDForDisplayname, makeChannelMention } from '@model/contracts/shared/functions.js'
import {
  MESSAGE_TYPES,
  MESSAGE_VARIANTS,
  CHATROOM_PRIVACY_LEVEL,
  CHATROOM_MEMBER_MENTION_SPECIAL_CHAR,
  CHATROOM_CHANNEL_MENTION_SPECIAL_CHAR
} from '@model/contracts/shared/constants.js'
import { convertToMarkdown } from '@view-utils/convert-to-markdown.js'

const TextObjectType = {
  Text: 'TEXT',
  MemberMention: 'MEMBER_MENTION',
  ChannelMention: 'CHANNEL_MENTION'
}
export default ({
  name: 'MessageBase',
  mixins: [emoticonsMixins],
  components: {
    Avatar,
    Tooltip,
    MessageActions,
    MessageReactions,
    SendArea,
    ChatAttachmentPreview
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
    convertTextToMarkdown: Boolean
  },
  computed: {
    ...mapGetters([
      'ourContactProfilesById',
      'usernameFromID',
      'chatRoomsInDetail'
    ]),
    textObjects () {
      return this.generateTextObjectsFromText(this.text)
    },
    replyMessageObjects () {
      return this.generateTextObjectsFromText(this.replyingMessage)
    },
    hasAttachments () {
      return Boolean(this.attachments?.length)
    },
    possibleMentions () {
      return [
        ...Object.keys(this.ourContactProfilesById).map(u => makeMentionFromUserID(u).me).filter(v => !!v),
        ...Object.values(this.chatRoomsInDetail).map(details => makeChannelMention(details.id))
      ]
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
    copyMessageLink () {
      if (!this.messageHash) { return }

      const url = new URL(location.href)
      url.search = `mhash=${this.messageHash}`

      navigator.clipboard.writeText(url.href)
    },
    selectEmoticon (emoticon) {
      this.$emit('add-emoticon', emoticon.native || emoticon)
    },
    openMenu () {
      this.$refs.messageAction.$refs.menu.handleTrigger()
    },
    isText (o) {
      return o.type === TextObjectType.Text
    },
    isMemberMention (o) {
      return o.type === TextObjectType.MemberMention
    },
    isChannelMention (o) {
      return o.type === TextObjectType.ChannelMention
    },
    generateTextObjectsFromText (text) {
      const containsMentionChar = str => new RegExp(`[${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${CHATROOM_CHANNEL_MENTION_SPECIAL_CHAR}]`, 'g').test(text)

      if (!text) {
        return []
      } else if (!containsMentionChar(text)) {
        return [
          {
            type: TextObjectType.Text,
            text: this.convertTextToMarkdown ? convertToMarkdown(text) : text
          }
        ]
      }
      const allMention = makeMentionFromUserID('').all

      return text
        // We try to find all the mentions and render them as mentions instead
        // of regular text. The `(?<=\\s|^)` part ensures that a mention is
        // preceded by a space or is the start of a line and the `(?=[^\\w\\d]|$)`
        // ensures that it's followed by an end-of-line or a character that's not
        // a letter or a number (so `Hi @user!` works).
        .split(new RegExp(`(?<=\\s|^)(${allMention}|${this.possibleMentions.join('|')})(?=[^\\w\\d]|$)`))
        .map(t => {
          const genDefaultTextObj = (text) => ({
            type: TextObjectType.Text,
            text: this.convertTextToMarkdown ? convertToMarkdown(text) : text
          })
          const genChannelMentionObj = (text) => {
            const chatroomId = text.slice(1)
            const found = Object.values(this.chatRoomsInDetail).find(details => details.id === chatroomId)

            return found
              ? {
                  type: TextObjectType.ChannelMention,
                  text: found.name,
                  icon: found.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE ? 'lock' : 'hashtag',
                  disabled: found.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE && !found.joined,
                  chatroomId: found.id
                }
              : genDefaultTextObj(text)
          }

          if (t === allMention) {
            return { type: TextObjectType.MemberMention, text: t }
          }

          return this.possibleMentions.includes(t)
            ? t.startsWith(CHATROOM_MEMBER_MENTION_SPECIAL_CHAR)
              ? {
                  type: TextObjectType.MemberMention,
                  text: CHATROOM_MEMBER_MENTION_SPECIAL_CHAR + this.usernameFromID(t.slice(1))
                }
              : genChannelMentionObj(t)
            : genDefaultTextObj(t)
        })
    },
    navigateToChatroom (obj) {
      if (obj.disabled ||
      obj.chatroomId === this.$route.params?.chatRoomId) { return }

      this.$router.push({
        name: 'GroupChatConversation',
        params: { chatRoomId: obj.chatroomId }
      })
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
    margin-right: 0.5rem;
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
  display: block;

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

  .c-member-mention,
  .c-channel-mention {
    background-color: transparent;
  }
}

.c-edited {
  margin-left: 0.2rem;
  font-size: 0.7rem;
  color: var(--text_1);
}

.c-member-mention,
.c-channel-mention {
  background-color: $primary_2;
  color: $primary_0;
  padding: 0 0.1rem 0.1rem;
}

.c-member-mention.c-mention-to-me {
  background-color: $warning_1;
}

.c-channel-mention {
  cursor: pointer;
  transition: color 150ms;
  outline: none;

  &:hover,
  &:focus {
    text-decoration: underline;
  }

  &:focus {
    color: $text_1;
  }

  &.is-disabled {
    cursor: inherit;
    background-color: $general_1;
    color: $text_1;

    &:hover,
    &:focus {
      text-decoration: none;
      background-color: $general_1;
    }
  }

  i {
    font-size: 0.75em;
    margin-right: 2px;
  }
}
</style>
