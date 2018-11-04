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
        :title="L('Private Messages')"
        routePath="/messages/"
        :list="privateMessages"
      />
    </template>
  </chatroom>
</template>
<style lang="scss" scoped>
@import "../assets/sass/theme/index";

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
    privateMessages () {
      // TODO - add GIBot item to list
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
  }
}
</script>
