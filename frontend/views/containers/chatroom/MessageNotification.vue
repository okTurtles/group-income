<template lang='pug'>
message-base(v-bind='$props' @addEmoticon='addEmoticon($event)')
  template(#body='')
    .c-notification
      p.c-text(v-if='message') {{message.text}}
</template>

<script>
import {
  L,
  MESSAGE_NOTIFICATIONS, MESSAGE_VARIANTS
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path
import { mapGetters } from 'vuex'
import MessageBase from './MessageBase.vue'

export default ({
  name: 'MessageNotification',
  components: {
    MessageBase
  },
  props: {
    id: String,
    type: String,
    text: String,
    notification: Object, // { type, params }
    who: String,
    currentUsername: String,
    avatar: String,
    datetime: {
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
        return Object.values(MESSAGE_VARIANTS).indexOf(value) !== -1
      }
    },
    isSameSender: Boolean,
    isCurrentUser: Boolean
  },
  computed: {
    ...mapGetters(['userDisplayName']),
    message () {
      const { username, channelName, channelDescription } = this.notification.params
      const displayName = this.userDisplayName(username)

      const text = {
        [MESSAGE_NOTIFICATIONS.ADD_MEMBER]: L('Added a member to {title}: {displayName}', { displayName, title: channelName }),
        [MESSAGE_NOTIFICATIONS.JOIN_MEMBER]: L('Joined {title}', { title: channelName }),
        [MESSAGE_NOTIFICATIONS.LEAVE_MEMBER]: L('Left {title}', { title: channelName }),
        [MESSAGE_NOTIFICATIONS.KICK_MEMBER]: L('Kicked a member from {title}: {displayName}', { displayName, title: channelName }),
        [MESSAGE_NOTIFICATIONS.UPDATE_NAME]: L('Updated the channel name to: {title}', { title: channelName }),
        [MESSAGE_NOTIFICATIONS.UPDATE_DESCRIPTION]: L('Updated the channel description to: {description}', { description: channelDescription }),
        [MESSAGE_NOTIFICATIONS.DELETE_CHANNEL]: L('Deleted the channel: {title}', { title: channelName }),
        [MESSAGE_NOTIFICATIONS.VOTE]: L('Voted on “{}”')
      }[this.notification.type]

      // let variant = 'simple'
      // if (this.notification.type === MESSAGE_NOTIFICATIONS.DELETE_CHANNEL) {
      //   variant = 'tooltip'
      // } else if (this.notification.type === MESSAGE_NOTIFICATIONS.VOTE) {
      //   variant = 'poll'
      // }

      return { text }
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
