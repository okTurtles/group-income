<template lang='pug'>
message-base(v-bind='$props' @add-emoticon='addEmoticon($event)')
  template(#body='')
    .c-notification
      p.c-text(v-if='message')
        | {{message.text}}
        i18n.c-link(v-if='isPollNotification' @click='jumpToPoll') Jump to poll
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
    ...mapGetters(['userDisplayName', 'isGroupDirectMessage', 'currentChatRoomId']),
    message () {
      const { username, channelName, channelDescription, votedOptions } = this.notification.params
      const displayName = this.userDisplayName(username)

      const notificationTemplates = {
        onGroupDM: {
          [MESSAGE_NOTIFICATIONS.ADD_MEMBER]: L('Added a member: {displayName}', { displayName }),
          [MESSAGE_NOTIFICATIONS.JOIN_MEMBER]: L('Joined')
        },
        default: {
          [MESSAGE_NOTIFICATIONS.ADD_MEMBER]: L('Added a member to {title}: {displayName}', { displayName, title: channelName }),
          [MESSAGE_NOTIFICATIONS.JOIN_MEMBER]: L('Joined {title}', { title: channelName }),
          [MESSAGE_NOTIFICATIONS.LEAVE_MEMBER]: L('Left {title}', { title: channelName }),
          [MESSAGE_NOTIFICATIONS.KICK_MEMBER]: L('Kicked a member from {title}: {displayName}', { displayName, title: channelName }),
          [MESSAGE_NOTIFICATIONS.UPDATE_NAME]: L('Updated the channel name to: {title}', { title: channelName }),
          [MESSAGE_NOTIFICATIONS.UPDATE_DESCRIPTION]:
            L('Updated the channel description to: {description}', { description: channelDescription }),
          [MESSAGE_NOTIFICATIONS.DELETE_CHANNEL]: L('Deleted the channel: {title}', { title: channelName }),
          [MESSAGE_NOTIFICATIONS.VOTE_ON_POLL]: L('Voted on “{options}”', { options: votedOptions }),
          [MESSAGE_NOTIFICATIONS.CHANGE_VOTE_ON_POLL]: L('Changed votes to “{options}”', { options: votedOptions })
        }
      }

      const notificationSelector = this.isGroupDirectMessage() ? 'onGroupDM' : 'default'
      const text = notificationTemplates[notificationSelector][this.notification.type]
      return { text }
    },
    isPollNotification () {
      return [
        MESSAGE_NOTIFICATIONS.VOTE_ON_POLL,
        MESSAGE_NOTIFICATIONS.CHANGE_VOTE_ON_POLL
      ].includes(this.notification.type)
    }
  },
  methods: {
    addEmoticon (emoticon) {
      this.$emit('add-emoticon', emoticon)
    },
    jumpToPoll () {
      alert('TODO: implement "jumping to a particular message."')
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
