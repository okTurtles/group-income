<template lang="pug">
chatroom(
  :title="L('Messages')"
  :searchplaceholder="L('Search for a person')"
)
  template(slot='nav')
    groups-shortcut.c-list(
      :groups='groupsByName'
      @select='handleGroupSelect'
    )
      conversations-list(
        :title="L('Messages')"
        :list='messages'
        routename='MessagesConversation'
        :type='type'
      )

</template>

<script>
import { mapGetters } from 'vuex'
import { chatTypes, individualMessagesSorted, users } from '@containers/chatroom/fakeStore.js'
import Chatroom from '@containers/chatroom/Chatroom.vue'
import GroupsShortcut from '@components/chatroom/GroupsShortcut.vue'
import ConversationsList from '@components/chatroom/ConversationsList.vue'

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

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

</style>
