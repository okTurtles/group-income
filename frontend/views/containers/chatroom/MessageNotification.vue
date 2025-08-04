<template lang='pug'>
message-base(v-bind='$props' @add-emoticon='addEmoticon($event)')
  template(#body='')
    .c-notification
      p.c-text(v-if='message')
        | {{message.text}}
</template>

<script>
import { L } from '@common/common.js'
import { mapGetters } from 'vuex'
import MessageBase from './MessageBase.vue'
import { MESSAGE_NOTIFICATIONS, MESSAGE_VARIANTS } from '@model/contracts/shared/constants.js'

export default ({
  name: 'MessageNotification',
  components: {
    MessageBase
  },
  props: {
    height: Number,
    id: String,
    messageHash: String,
    type: String,
    from: String,
    text: String,
    notification: Object, // { type, params }
    who: String,
    currentUserID: String,
    avatar: [Object, String],
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
    isMsgSender: Boolean
  },
  computed: {
    ...mapGetters(['userDisplayNameFromID', 'isGroupDirectMessage', 'currentChatRoomId']),
    message () {
      const {
        memberID,
        channelName,
        channelDescription
      } = this.notification.params
      const displayName = this.userDisplayNameFromID(memberID)

      const notificationTemplates = {
        // NOTE: 'onDirectMessage' is not being used at the moment
        //       since no notification messages are made inside the direct messages.
        //       But it's not removed because it could be useful in the future.
        onDirectMessage: {
          [MESSAGE_NOTIFICATIONS.ADD_MEMBER]: L('Added a member: {displayName}', { displayName }),
          [MESSAGE_NOTIFICATIONS.JOIN_MEMBER]: L('Joined'),
          [MESSAGE_NOTIFICATIONS.LEAVE_MEMBER]: L('Left'),
          [MESSAGE_NOTIFICATIONS.KICK_MEMBER]: L('Kicked a member {displayName}', { displayName })
        },
        default: {
          [MESSAGE_NOTIFICATIONS.ADD_MEMBER]: L('Added a member to {title}: {displayName}', { displayName, title: channelName }),
          [MESSAGE_NOTIFICATIONS.JOIN_MEMBER]: L('Joined {title}', { title: channelName }),
          [MESSAGE_NOTIFICATIONS.LEAVE_MEMBER]: L('Left {title}', { title: channelName }),
          [MESSAGE_NOTIFICATIONS.KICK_MEMBER]: L('Kicked a member from {title}: {displayName}', { displayName, title: channelName }),
          [MESSAGE_NOTIFICATIONS.UPDATE_NAME]: L('Updated the channel name to: {title}', { title: channelName }),
          [MESSAGE_NOTIFICATIONS.UPDATE_DESCRIPTION]:
            L('Updated the channel description to: {description}', { description: channelDescription })
        }
      }

      const templates = notificationTemplates[this.isGroupDirectMessage() ? 'onDirectMessage' : 'default']
      const text = templates[this.notification.type]
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

.c-link {
  display: inline-block;
  margin-left: 0.25rem;
  border-bottom: 1px solid $text_1;
  cursor: pointer;
  text-decoration: none;
  font-style: italic;
}
</style>
