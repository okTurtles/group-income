<template>
  <div class="c-greetings">
    <avatar v-for="user in founders"
      size="sm"
      class="c-avatar"
      :src="user.picture"
      :alt="user.displayName || user.name"
    />
    <div>
      <message-notification>
        {{text}}
      </message-notification>
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
import { users } from './fakeStore.js'
import MessageNotification from '../../components/Chatroom/MessageNotification.vue'
import Avatar from '../../components/Avatar.vue'

export default {
  name: 'ConversationGreetings',
  components: {
    MessageNotification,
    Avatar
  },
  data () {
    return {}
  },
  computed: {
    founders () {
      return [
        this.$store.getters.currentUserIdentityContract.attributes,
        users[this.$route.params.currentConversation.id]
      ]
    },
    text () {
      const { type } = this.$route.params.currentConversation

      // OPTIMIZE/TODO - a more customized greeting message

      if (type === 'messages') {
        return this.L('You guys can chat in private here.')
      }

      if (type === 'channel') {
        return this.L('This is the very beginning of this channel.')
      }

      return 'hum....'
    }
  },
  methods: {}
}
</script>
