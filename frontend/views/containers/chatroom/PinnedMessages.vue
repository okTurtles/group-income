<template lang='pug'>
.card.c-pinned-messages-wrapper
  template(v-for='(msg, index) in messages')
    .c-pinned-message(
      :key='msg.hash'
      @click='scrollToPinnedMessage(msg.hash)'
    )
      .c-pinned-message-header
        .c-sender-profile
          avatar-user(:contractID='msg.from' size='xs')
          .c-message-sender-name.has-text-bold.has-ellipsis {{ userDisplayNameFromID(msg.from) }}
        tooltip(:text='L("Unpin this message")')
          i.icon-times(
            @click.stop='unpinMessage(msg.hash)'
          )
      .c-pinned-message-content
        span.custom-markdown-content(
          v-if='isText(msg)'
          v-safe-html:a='renderMarkdown(msg.text)'
        )
        .c-poll-wrapper(v-else-if='isPoll(msg)')
          poll-vote-result.c-poll-inner(
            :pollData='msg.pollData'
            :readOnly='true'
          )
        .c-attachments-wrapper(v-if='hasAttachments(msg)')
          chat-attachment-preview(
            :attachmentList='msg.attachments'
            :isForDownload='true'
            :variant='messageSentVariant'
          )
      .c-pinned-message-footer
        span {{ humanDate(msg.datetime, { month: 'long', year: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }) }}

</template>

<script>
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import Tooltip from '@components/Tooltip.vue'
import PollVoteResult from '@containers/chatroom/poll-message-content/PollVoteResult.vue'
import ChatAttachmentPreview from '@containers/chatroom/file-attachment/ChatAttachmentPreview.vue'
import { humanDate } from '@model/contracts/shared/time.js'
import { MESSAGE_TYPES, MESSAGE_VARIANTS } from '@model/contracts/shared/constants.js'
import { renderMarkdown } from '@view-utils/markdown-utils.js'

export default ({
  name: 'PinnedMessage',
  components: {
    AvatarUser,
    Tooltip,
    PollVoteResult,
    ChatAttachmentPreview
  },
  props: {
    messages: {
      type: Array,
      default: () => []
    }
  },
  data () {
    return {}
  },
  computed: {
    ...mapGetters(['userDisplayNameFromID']),
    messageSentVariant () {
      return MESSAGE_VARIANTS.SENT
    }
  },
  methods: {
    humanDate,
    renderMarkdown,
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
    },
    scrollToPinnedMessage (messageHash) {
      this.$emit('scroll-to-pinned-message', messageHash)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-pinned-messages-wrapper {
  margin: -0.5rem;
  padding: 0.75rem;
  max-height: 40rem;
  max-width: 25rem;
  width: 25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: auto;

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

      i.icon-times {
        margin-right: 0.25rem;
      }
    }

    .c-pinned-message-content {
      margin: 0.5rem 0;

      .c-poll-inner {
        position: relative;
        width: 100%;
        border-radius: 10px;
        border: 1px solid $general_0;
        padding: 1rem;
        background-color: $background_0;
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
