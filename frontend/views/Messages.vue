<template>
  <chatroom
    :title="L('Messages')"
    :searchPlaceholder="L('Search for a person')"
  >
    <template slot="nav">
      <groups-shortcut class="c-list"
        :groups="groupsByName"
        @select="handleGroupSelect"
      />
      <conversations-list
        :title="L('Messages')"
        :list="messages"
        routeName="MessagesConversation"
        :type="type"
      />
    </template>
  </chatroom>
</template>
<style lang="scss" scoped>
@import "../assets/sass/theme/index";

</style>
<script>
import { mapGetters } from 'vuex'
import { chatTypes, individualMessagesSorted, users } from './containers/Chatroom/fakeStore.js'
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
    return {
      ephemeral: {
        summary: null,
        details: null
      }
    }
  },
  computed: {
    ...mapGetters([
      'groupsByName'
    ]),
    messages () {
      return {
        order: individualMessagesSorted,
        conversations: users
      }
    },
    type () {
      return chatTypes.INDIVIDUAL
    }
  },
  methods: {
    handleGroupSelect (hash) {
      this.$store.commit('setCurrentGroupId', hash)
    }
  }
}
</script>
