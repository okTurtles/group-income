<template lang='pug'>
.card.c-pinned-messages-wrapper
  template(v-for='(msg, index) in messages')
    .c-pinned-message(
      :key='msg.hash'
      @click='scrollToPinnedMessage(msg)'
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
          v-safe-html:a='renderMarkdown(msg.text)'
        )
      .c-pinned-message-footer
        span {{ humanDate(msg.datetime, { month: 'long', year: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }) }}

</template>

<script>
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import Tooltip from '@components/Tooltip.vue'
import { humanDate } from '@model/contracts/shared/time.js'
import { renderMarkdown } from '@view-utils/markdown-utils.js'

export default ({
  name: 'PinnedMessage',
  components: {
    AvatarUser,
    Tooltip
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
    ...mapGetters(['userDisplayNameFromID'])
  },
  methods: {
    humanDate,
    renderMarkdown,
    unpinMessage (messageHash) {
      console.log('TODO: Unpin Message -', messageHash)
    },
    scrollToPinnedMessage (message) {
      console.log('TODO: Scroll To Pinned Message -', message)
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
