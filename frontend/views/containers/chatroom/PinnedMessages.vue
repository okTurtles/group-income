<template lang="pug">
.c-pinned-messages(
  v-if='ephemeral.isActive'
  data-test='pinnedMessages'
  @click='onBackDropClick'
  @keyup.esc='close'
)
  .c-pinned-messages-wrapper(:style='this.ephemeral.isDesktopScreen ? this.ephemeral.wrapperPosition : {}')
    header.c-header
      i18n.is-title-2.c-popup-title(tag='h2') Pinned Messages
      modal-close.c-popup-close-btn(v-if='!ephemeral.isDesktopScreen' @close='close')

    section.c-body
      template(v-for='(msg, index) in messages')
        .c-pinned-message(:key='msg.hash' @click='scrollToPinnedMessage(msg.hash)')
          .c-pinned-message-header
            .c-sender-profile
              avatar-user(:contractID='msg.from' size='xs')
              .c-message-sender-name.has-text-bold.has-ellipsis {{ userDisplayNameFromID(msg.from) }}
            tooltip(:text='ephemeral.isDesktopScreen ? L("Unpin this message") : L("Unpin")')
              span.c-unpin-button(data-test='unpinFromChannel' @click.stop='unpinMessage(msg.hash)')
                i.icon-times
          .c-pinned-message-content
            render-message-with-markdown.c-text(v-if='isText(msg)' :text='msg.text' :edited='!!msg.updatedDate')
            .c-poll-wrapper(v-else-if='isPoll(msg)')
              poll-vote-result.c-poll-inner(:pollData='msg.pollData' :readOnly='true')
            chat-attachment-preview(
              v-if='hasAttachments(msg)'
              :attachmentList='msg.attachments'
              :isForDownload='true'
              :ownerID='msg.from'
              :variant='messageSentVariant'
            )
            .c-message-reactions-wrapper
              message-reactions(
                :emoticonsList='msg.emoticons'
                :messageType='msg.type'
                :currentUserID='ourIdentityContractId'
                :readOnly='true'
              )
          .c-pinned-message-footer
            span {{ humanDate(msg.datetime, { month: 'long', year: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }) }}
</template>

<script>
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import Tooltip from '@components/Tooltip.vue'
import ModalClose from '@components/modal/ModalClose.vue'
import PollVoteResult from './poll-message-content/PollVoteResult.vue'
import ChatAttachmentPreview from './file-attachment/ChatAttachmentPreview.vue'
import MessageReactions from './MessageReactions.vue'
import RenderMessageWithMarkdown from './chat-mentions/RenderMessageWithMarkdown.js'
import { humanDate } from '@model/contracts/shared/time.js'
import {
  MESSAGE_TYPES,
  MESSAGE_VARIANTS,
  CHATROOM_MEMBER_MENTION_SPECIAL_CHAR,
  CHATROOM_CHANNEL_MENTION_SPECIAL_CHAR
} from '@model/contracts/shared/constants.js'
import { renderMarkdown } from '@view-utils/markdown-utils.js'
import { makeMentionFromUserID, makeChannelMention, getIdFromChannelMention } from '@model/chatroom/utils.js'

export default {
  name: 'PinnedMessages',
  components: {
    AvatarUser,
    Tooltip,
    PollVoteResult,
    ChatAttachmentPreview,
    MessageReactions,
    RenderMessageWithMarkdown,
    ModalClose
  },
  computed: {
    ...mapGetters([
      'userDisplayNameFromID',
      'ourIdentityContractId',
      'ourContactProfilesById',
      'chatRoomsInDetail',
      'usernameFromID'
    ]),
    possibleMentions () {
      return [
        ...Object.keys(this.ourContactProfilesById).map(u => makeMentionFromUserID(u).me).filter(v => !!v),
        makeChannelMention('[a-zA-Z0-9]+', true) // chat-mention as contractID has a format of `#:chatID:...`. So target them as a pattern instead of the exact strings.
      ]
    },
    messageSentVariant () {
      return MESSAGE_VARIANTS.SENT
    }
  },
  data () {
    return {
      ephemeral: {
        isActive: false,
        isDesktopScreen: false,
        wrapperPosition: {
          top: 0,
          left: 0
        }
      },
      messages: []
    }
  },
  methods: {
    humanDate,
    renderMarkdown,
    renderTextMessage (text) {
      // TODO: Update this after PR #2016 is merged
      const replaceChannelMention = (text) => {
        const chatRoomID = getIdFromChannelMention(text)
        const found = Object.values(this.chatRoomsInDetail).find(details => details.id === chatRoomID)
        return found ? `#${found.name}` : text
      }

      const regExpPossibleMentions = new RegExp(`(?<=\\s|^)(${this.possibleMentions.join('|')})(?=[^\\w\\d]|$)`)
      const mentionReplacedText = text.split(regExpPossibleMentions)
        .map(t => {
          if (regExpPossibleMentions.test(t)) {
            if (t.startsWith(CHATROOM_MEMBER_MENTION_SPECIAL_CHAR)) {
              return CHATROOM_MEMBER_MENTION_SPECIAL_CHAR + this.usernameFromID(t.slice(1))
            } else if (t.startsWith(CHATROOM_CHANNEL_MENTION_SPECIAL_CHAR)) {
              return replaceChannelMention(t)
            }
          }
          return t
        }).join('')

      return renderMarkdown(mentionReplacedText)
    },
    open (position, pinnedMessages) {
      if (this.ephemeral.isActive) { return }

      this.messages = pinnedMessages

      if (position) {
        this.ephemeral.wrapperPosition = { ...position }
        this.$nextTick(() => { this.ephemeral.isActive = true })
      } else {
        this.ephemeral.isActive = true
      }
    },
    close () {
      if (this.ephemeral.isActive) {
        this.ephemeral.isActive = false
      }
    },
    onBackDropClick (e) {
      if (e.target.matches('.c-pinned-messages')) {
        this.close()
      }
    },
    resizeHandler () {
      if (window.matchMedia('(hover: hover)').matches) {
        // This is a fix for the issue #1954(https://github.com/okTurtles/group-income/issues/1954)
        // -> closes the pop-up if the viewport size changes only when it's NOT a touch device.
        //    e.g) The viewport size changes when the keyboard tab is pulled out on the touch device.
        this.close()
      }
    },
    isText (message) {
      return message.type === MESSAGE_TYPES.TEXT
    },
    isPoll (message) {
      return message.type === MESSAGE_TYPES.POLL
    },
    hasAttachments (message) {
      return message.attachments?.length > 0
    },
    unpinMessage (messageHash) {
      this.$emit('unpin-message', messageHash)
      this.close()
    },
    scrollToPinnedMessage (messageHash) {
      this.$emit('scroll-to-pinned-message', messageHash)
      this.close()
    }
  },
  created () {
    this.matchMediaDesktop = window.matchMedia('screen and (min-width: 1200px)')
    this.matchMediaDesktop.onchange = (e) => {
      this.ephemeral.isDesktopScreen = e.matches
    }
    this.ephemeral.isDesktopScreen = this.matchMediaDesktop.matches

    window.addEventListener('resize', this.resizeHandler)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.resizeHandler)

    this.matchMediaDesktop.onchange = null
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-pinned-messages {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  overflow: hidden;
  // NOTE: z-index should be bigger than the one of sidebar
  //       because PinnedMessages modal is rendered before the sidebar
  // REF:  https://github.com/okTurtles/group-income/issues/1843
  z-index: $zindex-modal + 1;
  pointer-events: initial;
  height: 100%;
}

.c-pinned-messages-wrapper {
  position: absolute;
  pointer-events: inherit;
  background-color: $background_0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas: "pinned-messages-header" "pinned-messages-body";

  @include desktop {
    max-width: 25rem;
    width: 25rem;
    height: fit-content;
    max-height: 70vh;
    border-radius: 0.75rem;
    box-shadow: 0 0 20px rgba(219, 219, 219, 0.6);
    left: unset;

    .is-dark-theme & {
      box-shadow: 0 0 20px rgba(38, 38, 38, 0.625);
    }
  }
}

.c-header {
  grid-area: pinned-messages-header;
  position: relative;
  height: 5.75rem;
  display: flex;
  align-items: center;
  justify-content: center;

  @include desktop {
    display: none;
  }

  .c-popup-title {
    font-size: $size_2;
    text-align: center;

    @include tablet {
      font-size: $size_3;
      text-align: left;
    }
  }
}

.c-body {
  grid-area: pinned-messages-body;
  position: relative;
  padding: 0.5rem 0.5rem;
  overflow-y: auto;
  height: fit-content;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .c-pinned-message {
    padding: 0.75rem 0.75rem 0.5rem 0.75rem;
    color: $text_0;
    border-radius: 0.3rem;
    background-color: $general_2;
    cursor: pointer;

    .c-pinned-message-header {
      display: flex;
      justify-content: space-between;

      .c-sender-profile {
        max-width: calc(100% - 1rem);
        display: flex;
        align-items: center;

        .c-message-sender-name {
          // xs avatar size is 1.5rem
          max-width: calc(100% - 1.5rem);
          margin-left: 0.25rem;
        }
      }

      .c-unpin-button {
        width: 1.5rem;
        height: 1.5rem;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    }

    .c-pinned-message-content {
      margin: 0.5rem 0;

      .c-text {
        white-space: pre-line;
        word-break: break-word;
      }

      .c-poll-inner {
        position: relative;
        width: 100%;
        border-radius: 10px;
        border: 1px solid $general_0;
        padding: 1rem;
        background-color: $background_0;
      }

      .c-message-reactions-wrapper {
        margin-left: -3rem;
      }
    }

    .c-pinned-message-footer {
      font-size: 0.7rem;
      color: $text_1;

      span:hover {
        text-decoration: underline;
      }
    }
  }
}
</style>
