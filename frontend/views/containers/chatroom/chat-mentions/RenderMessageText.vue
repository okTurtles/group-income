<template lang='pug'>
component.c-message-text(
  :is='tag'
  v-bind='$attrs'
  v-on='$listeners'
  :class='{ "is-replying": isReplyingMessage, "has-trailing-ellipsis": showTrailingEllipsis }'
)
  template(v-for='objText in textObjects')
    span(
      v-if='isText(objText)'
      v-safe-html:a='objText.text'
    )

    template(v-else-if='isMemberMention(objText)')
      span.c-mention-profile-card-wrapper(v-if='objText.userID')
        profile-card(:contractID='objText.userID' direction='top-left')
          span.c-member-mention(:class='{"c-mention-to-me": objText.toMe}') {{ objText.text }}
      span.c-member-mention(v-else class='c-mention-to-me') {{ objText.text }}

    span.c-channel-mention(
      v-else-if='isChannelMention(objText)'
      :tabindex='objText.disabled ? undefined : 0'
      :class='{ "is-disabled": objText.disabled }'
      @click='navigateToChatRoom(objText)'
      @keyup.enter='navigateToChatRoom(objText)'
    )
      i(:class='"icon-" + objText.icon')
      span {{ objText.text }}

  i18n.c-edited(v-if='!isReplyingMessage && edited') (edited)
</template>

<script>
import { mapGetters } from 'vuex'
import ProfileCard from '@components/ProfileCard.vue'
import {
  CHATROOM_PRIVACY_LEVEL,
  CHATROOM_MEMBER_MENTION_SPECIAL_CHAR,
  CHATROOM_CHANNEL_MENTION_SPECIAL_CHAR,
  CHATROOM_REPLYING_MESSAGE_LIMITS_IN_CHARS
} from '@model/contracts/shared/constants.js'
import { makeMentionFromUserID, makeChannelMention, getIdFromChannelMention } from '@model/chatroom/utils.js'
import { TextObjectType } from '@utils/constants.js'
import { L } from '@common/common.js'

export default ({
  name: 'RenderMessageText',
  components: {
    ProfileCard
  },
  props: {
    text: {
      type: String,
      required: true,
      default: ''
    },
    tag: {
      type: String,
      default: 'p'
    },
    edited: Boolean,
    isReplyingMessage: Boolean
  },
  computed: {
    ...mapGetters([
      'usernameFromID',
      'chatRoomsInDetail'
    ]),
    textObjects () {
      return this.generateTextObjectsFromText(this.text)
    },
    possibleMentions () {
      return [
        ...Object.keys(this.$store.state.reverseNamespaceLookups).map(u => makeMentionFromUserID(u).me).filter(v => !!v),
        makeChannelMention('[^\\s]+', true) // chat-mention as contractID has a format of `#:chatID:...`. So target them as a pattern instead of the exact strings.
      ]
    },
    showTrailingEllipsis () {
      return this.isReplyingMessage && this.text.length === CHATROOM_REPLYING_MESSAGE_LIMITS_IN_CHARS
    }
  },
  methods: {
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
      const wrapEmojis = str => {
        const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|[\u2615-\u27BF]|\u200D)/gu
        // We should be able to style the emojis in message-text (reference issue: https://github.com/okTurtles/group-income/issues/2464)
        return str.replace(emojiRegex, '<span class="chat-emoji">$1</span>')
      }

      if (!text) { return [] }
      if (!containsMentionChar(text)) {
        return [{
          type: TextObjectType.Text,
          text: wrapEmojis(text)
        }]
      }
      const allMention = makeMentionFromUserID('').all
      const regExpPossibleMentions = new RegExp(`(?<=\\s|^)(${allMention}|${this.possibleMentions.join('|')})(?=[^\\w\\d]|$)`)

      return text
        // We try to find all the mentions and render them as mentions instead
        // of regular text. The `(?<=\\s|^)` part ensures that a mention is
        // preceded by a space or is the start of a line and the `(?=[^\\w\\d]|$)`
        // ensures that it's followed by an end-of-line or a character that's not
        // a letter or a number (so `Hi @user!` works).
        .split(regExpPossibleMentions)
        .map(t => {
          const genDefaultTextObj = (text) => ({
            type: TextObjectType.Text,
            text: wrapEmojis(text)
          })
          const genChannelMentionObj = (text) => {
            const chatRoomID = getIdFromChannelMention(text)
            const found = Object.values(this.chatRoomsInDetail).find(details => details.id === chatRoomID)

            if (found) {
              const isPrivate = found.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE
              const shouldDisable = isPrivate && !found.joined

              return {
                type: TextObjectType.ChannelMention,
                text: shouldDisable ? L('private channel') : found.name,
                icon: isPrivate ? 'lock' : 'hashtag',
                disabled: shouldDisable,
                chatRoomID: found.id
              }
            } else {
              return {
                type: TextObjectType.ChannelMention,
                text: L('unknown chatroom'),
                icon: 'ban',
                disabled: true,
                chatRoomID
              }
            }
          }

          const genMemberMentionObj = (text) => {
            const userID = text.slice(1)
            return {
              type: TextObjectType.MemberMention,
              text: CHATROOM_MEMBER_MENTION_SPECIAL_CHAR + this.usernameFromID(userID),
              userID,
              toMe: userID === this.currentUserID
            }
          }

          if (t === allMention) {
            return { type: TextObjectType.MemberMention, text: t, toMe: true }
          }

          return regExpPossibleMentions.test(t)
            ? t.startsWith(CHATROOM_MEMBER_MENTION_SPECIAL_CHAR)
              ? genMemberMentionObj(t)
              : genChannelMentionObj(t)
            : genDefaultTextObj(t)
        })
    },
    navigateToChatRoom (obj) {
      if (obj.disabled || obj.chatRoomID === this.$route.params?.chatRoomID) { return }
      this.$router.push({
        name: 'GroupChatConversation',
        params: { chatRoomID: obj.chatRoomID }
      })
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-mention-profile-card-wrapper {
  display: inline-block;
}

.c-member-mention,
.c-channel-mention {
  background-color: $primary_2;
  color: $primary_0;
  padding: 0 0.2rem 0.2rem;
}

.c-member-mention.c-mention-to-me {
  background-color: $warning_1;
}

.c-message-text {
  &.is-replying {
    border-left: 2px;
    border-color: #dbdbdb; // var(--text_1);
    border-style: none none none solid;
    font-size: 0.75rem;
    color: var(--text_1);
    font-style: italic;
    padding-left: 0.25rem;
    white-space: pre-line;
    margin-bottom: 0.5rem;

    &:hover {
      cursor: pointer;
      color: var(--text_2);
      border-color: var(--text_1); // var(--text_2);
    }

    .c-member-mention,
    .c-channel-mention {
      background-color: transparent;
    }

    &.has-trailing-ellipsis::after {
      content: "...";
      position: relative;
      margin-top: 0.25rem;
    }
  }
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
    margin-right: 4px;
  }
}

.c-edited {
  margin-left: 0.2rem;
  font-size: 0.7rem;
  color: var(--text_1);
}
</style>
