<template lang='pug'>
message-base(v-bind='$props' @addEmoticon='addEmoticon($event)')
  template(#body='')
    .c-notification
      p.c-text(v-if='message') {{message.text}}
</template>

<script>
import MessageBase from './MessageBase.vue'
import { interactionType, fakeEvents, users } from '@containers/chatroom/fakeStore.js'
import chatroom from '@containers/chatroom/chatroom.js'
import L from '@view-utils/translations.js'

export default {
  name: 'MessageNotification',
  components: {
    MessageBase
  },
  props: {
    id: String,
    text: String,
    who: String,
    currentUserId: String,
    avatar: String,
    time: {
      type: Date,
      required: true
    },
    emoticonsList: {
      type: Object,
      default: null
    },
    isSameSender: Boolean,
    isCurrentUser: Boolean
  },
  computed: {
    message () {
      const summary = chatroom.summary
      let text = ''
      let variant = 'simple'
      const event = fakeEvents[this.id]

      switch (event.interactionType) {
        case interactionType.CHAT_NEW_MEMBER:
          text = L('Added members to this channel: {displayName}', users[event.to])
          break

        case interactionType.CHAT_REMOVE_MEMBER:
          text = L('Left {title}', summary)
          break

        case interactionType.CHAT_NAME_UPDATE:
          text = L('Updated the channel name to: {title}', summary)
          break

        case interactionType.CHAT_DESCRIPTION_UPDATE:
          text = L('Updated the channel description to: {title}', summary)
          break

        case interactionType.CHAT_DELETE:
          text = L('Deleted the channel: {title}', summary)
          variant = 'tooltip'
          break

        case interactionType.VOTED:
          text = L('Voted on “{}”')
          variant = 'poll'
          break
      }

      return {
        text,
        variant
      }
    }
  },
  methods: {
    addEmoticon (emoticon) {
      this.$emit('addEmoticon', emoticon)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-notification {
  color: $text_1;
  font-style: italic;
}
</style>
