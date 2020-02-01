<template lang='pug'>
.c-greetings
  avatar(
    v-for='(user, index) in founders'
    :key='`user-${index}`'
    :src='user.picture'
    :alt='user.displayName || user.name'
    size='sm'
  )
  message-notification {{text}}
</template>

<script>
import { chatTypes, users, groupA } from './fakeStore.js'
import MessageNotification from './MessageNotification.vue'
import Avatar from '@components/Avatar.vue'

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
          this.$store.getters.ourUserIdentityContract.attributes,
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

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-greetings {
  margin-bottom: $spacer-lg;
  display: flex;
  align-items: flex-end;
}

.c-avatar {
  margin-right: $spacer-sm;
}
</style>
