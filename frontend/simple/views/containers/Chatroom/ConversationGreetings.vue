<template>
  <div class="c-greetings">
    <avatar v-for="user in founders"
      size="sm"
      class="c-avatar"
      :src="user.picture"
      :alt="user.displayName || user.name"
    />
    <div>
      <message-notification :text="text" />
    </div>
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
import { groupA, users } from './fakeStore.js'
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
        messages: 'You and {name} can chat in private here.',
        groupChat: 'This is the very beginning of {name} channel.'
      }
    },
    founders () {
      const foundersMap = {
        messages: [
          this.$store.getters.currentUserIdentityContract.attributes,
          users[this.$route.params.currentConversation.id]
        ],
        groupChat: [
          ...groupA.founders.map(founder => users[founder])
        ]
      }

      return foundersMap[this.type]
    },
    text () {
      const conversationSummaryMap = {
        messages: users[this.$route.params.currentConversation.id],
        groupChat: groupA.channels[this.$route.params.currentConversation.id]
      }

      return this.L(this.greetingMap[this.type], { name: conversationSummaryMap[this.type].displayName })
    },
    type () {
      return this.$route.params.currentConversation.type
    }
  }
}
</script>
