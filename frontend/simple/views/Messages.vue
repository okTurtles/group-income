<template>
  <chatroom
    :title="L('Messages')"
  >
    <input class="input" type="text" placeholder="Search for a conversation">
    <groups-shortcut class="c-list"
      :groups="groupsByName"
      @select="handleGroupSelect"
    />
    <conversations-list class="c-list"
      routePath="/messages/"
      routeName="messagesConversation"
      type="messages"
      :list="privateMessages"
    />
  </chatroom>
</template>
<style lang="scss" scoped>
@import "../assets/sass/theme/index";

.c-list {
  margin: $gi-spacer*1.5 0;
}

</style>
<script>
import { mapGetters } from 'vuex'
import { privateMessagesSortedByTime, users } from './containers/Chatroom/fakeStore.js'
import Chatroom from './containers/Chatroom/Chatroom.vue'
import GroupsShortcut from './components/Chatroom/GroupsShortcut.vue'
import ConversationsList from './components/Chatroom/ConversationsList.vue'

export default {
  name: 'Messages',
  components: {
    Chatroom,
    GroupsShortcut,
    ConversationsList
  },
  data () {
    return {}
  },
  computed: {
    ...mapGetters([
      'groupsByName'
    ]),
    privateMessages () {
      return {
        order: privateMessagesSortedByTime,
        conversations: users
      }
    }
  },
  methods: {
    handleGroupSelect (hash) {
      this.$store.commit('setCurrentGroupId', hash)
    }
    // OPTIMIZE/TODO - update the store with the current conversationId when that happens
  }
}
</script>
