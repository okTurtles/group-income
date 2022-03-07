<template lang='pug'>
message-base(v-bind='$props' @addEmoticon='addEmoticon($event)')
  template(#body='')
    .c-notification
      p.c-text(v-if='message') {{message.text}}
</template>

<script>
import { mapGetters } from 'vuex'
import MessageBase from './MessageBase.vue'
import L from '@view-utils/translations.js'
import { MESSAGE_NOTIFICATIONS, MESSAGE_VARIANTS } from '@model/contracts/constants.js'

export default ({
  name: 'MessageNotification',
  components: {
    MessageBase
  },
  props: {
    id: String,
    text: String,
    notification: Object, // { type, params }
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
    variant: {
      type: String,
      validator (value) {
        return [
          MESSAGE_VARIANTS.SENT,
          MESSAGE_VARIANTS.RECEIVED,
          MESSAGE_VARIANTS.PENDING,
          MESSAGE_VARIANTS.FAILED
        ].indexOf(value) !== -1
      }
    },
    isSameSender: Boolean,
    isCurrentUser: Boolean
  },
  computed: {
    ...mapGetters(['globalProfile']),
    message () {
      let text = ''
      let variant = 'simple'
      const { username, channelName, channelDescription } = this.notification.params
      const displayName = !username ? '' : this.globalProfile(username).displayName || username
      switch (this.notification.type) {
        case MESSAGE_NOTIFICATIONS.ADD_MEMBER:
          text = L('Added a member to {title}: {displayName}', { displayName, title: channelName })
          break

        case MESSAGE_NOTIFICATIONS.JOIN_MEMBER:
          text = L('Joined {title}', { title: channelName })
          break

        case MESSAGE_NOTIFICATIONS.LEAVE_MEMBER:
          text = L('Left {title}', { title: channelName })
          break

        case MESSAGE_NOTIFICATIONS.KICK_MEMBER:
          text = L('Kicked a member from {title}: {displayName}', { displayName, title: channelName })
          break

        case MESSAGE_NOTIFICATIONS.UPDATE_NAME:
          text = L('Updated the channel name to: {title}', { title: channelName })
          break

        case MESSAGE_NOTIFICATIONS.UPDATE_DESCRIPTION:
          text = L('Updated the channel description to: {description}', { description: channelDescription })
          break

        case MESSAGE_NOTIFICATIONS.DELETE_CHANNEL:
          text = L('Deleted the channel: {title}', { title: channelName })
          variant = 'tooltip'
          break

        case MESSAGE_NOTIFICATIONS.VOTE:
          text = L('Voted on “{}”')
          variant = 'poll'
          break
      }

      return { text, variant }
    }
  },
  methods: {
    addEmoticon (emoticon) {
      this.$emit('add-emoticon', emoticon)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-notification {
  color: $text_1;
  font-style: italic;
}
</style>
