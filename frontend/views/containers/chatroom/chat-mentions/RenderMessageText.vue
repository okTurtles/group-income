<template lang='pug'>
component.c-message-text(
  :is='tag'
  v-bind='$attrs'
  v-on='$listeners'
  :class='{ "is-replying": isReplyingMessage }'
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
  CHATROOM_CHANNEL_MENTION_SPECIAL_CHAR
} from '@model/contracts/shared/constants.js'
import { makeMentionFromUserID, makeChannelMention } from '@model/contracts/shared/functions.js'
const TextObjectType = {
  Text: 'TEXT',
  MemberMention: 'MEMBER_MENTION',
  ChannelMention: 'CHANNEL_MENTION'
}

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
      'ourContactProfilesById',
      'usernameFromID',
      'chatRoomsInDetail'
    ]),
    textObjects () {
      return this.generateTextObjectsFromText(this.text)
    },
    possibleMentions () {
      return [
        ...Object.keys(this.ourContactProfilesById).map(u => makeMentionFromUserID(u).me).filter(v => !!v),
        ...Object.values(this.chatRoomsInDetail).map(details => makeChannelMention(details.id))
      ]
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

      if (!text) { return [] }
      if (!containsMentionChar(text)) {
        return [{ type: TextObjectType.Text, text }]
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
            type: TextObjectType.Text, text
          })
          const genChannelMentionObj = (text) => {
            const chatRoomID = text.slice(1)
            const found = Object.values(this.chatRoomsInDetail).find(details => details.id === chatRoomID)

            return found
              ? {
                  type: TextObjectType.ChannelMention,
                  text: found.name,
                  icon: found.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE ? 'lock' : 'hashtag',
                  disabled: found.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE && !found.joined,
                  chatRoomID: found.id
                }
              : genDefaultTextObj(text)
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

          return this.possibleMentions.includes(t)
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
  padding: 0 0.1rem 0.1rem;
}

.c-member-mention.c-mention-to-me {
  background-color: $warning_1;
}

.c-message-text.is-replying {
  border-left: 2px;
  border-color: #dbdbdb; // var(--text_1);
  border-style: none none none solid;
  font-size: 0.75rem;
  color: var(--text_1);
  font-style: italic;
  padding-left: 0.25rem;
  white-space: pre-line;

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

.c-edited {
  margin-left: 0.2rem;
  font-size: 0.7rem;
  color: var(--text_1);
}
</style>
