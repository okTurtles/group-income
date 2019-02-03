<template>
  <div class="c-greetings">
    <avatar v-for="user in founders"
      size="sm"
      class="c-avatar"
      :src="user.picture"
      :alt="user.displayName || user.name"
    />
    <message-notification>{{text}}</message-notification>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-greetings {
  align-self: center;
  text-align: center;
  margin-bottom: $gi-spacer-lg;
}

.c-avatar {
  margin-left: -$gi-spacer-xs;
  margin-right: -$gi-spacer-xs;
  box-shadow: 0 0 0 1px $body-background-color;
}
</style>
<script>
import { chatTypes, users, groupA } from './fakeStore.js'
import MessageNotification from '../../components/Chatroom/MessageNotification.vue'
import Avatar from '../../components/Avatar.vue'

export default {
  name: 'ConversationGreetings',
  components: {
    MessageNotification,
    Avatar
  },
  computed: {
    greetingMap () {
      return {
        GIBot: 'I’m here to keep you update while you are away.',
        [chatTypes.INDIVIDUAL]: 'You and {name} can chat in private here.',
        [chatTypes.GROUP]: 'This is the very beginning of {name} channel.'
      }
    },
    founders () {
      const foundersMap = {
        [chatTypes.INDIVIDUAL]: [
          this.$store.getters.currentUserIdentityContract.attributes,
          users[this.$route.params.currentConversation.id]
        ],
        [chatTypes.GROUP]: [
          ...groupA.founders.map(founder => users[founder])
        ]
      }

      return foundersMap[this.type]
    },
    text () {
      if (this.$route.params.currentConversation.id === 'GIBot') {
        return this.L(this.greetingMap.GIBot)
      }

      const conversationSummaryMap = {
        [chatTypes.INDIVIDUAL]: users[this.$route.params.currentConversation.id],
        [chatTypes.GROUP]: groupA.channels[this.$route.params.currentConversation.id]
      }

      return this.L(this.greetingMap[this.type], { name: conversationSummaryMap[this.type].displayName })
    },
    type () {
      return this.$route.params.currentConversation.type
    }
  }
}
</script>
