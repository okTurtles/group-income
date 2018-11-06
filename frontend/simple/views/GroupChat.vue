<template>
  <chatroom
    :title="L('Chat')"
    :searchPlaceholder="L('Search for a channel')"
  >
    <template slot="nav">
      <conversations-list
        :title="L('Channels')"
        routePath="/group-chat/"
        :list="channels"
      />

      <conversations-list
        :title="L('Members')"
        routePath="/group-chat/"
        :list="members"
      />
    </template>
  </chatroom>
</template>
<style lang="scss" scoped>
@import "../assets/sass/theme/index";

</style>
<script>
import { mapGetters } from 'vuex'
import { groupA, groupB, users } from './containers/Chatroom/fakeStore.js'
import Chatroom from './containers/Chatroom/Chatroom.vue'
import ConversationsList from './components/Chatroom/ConversationsList.vue'

export default {
  name: 'GroupChat',
  components: {
    Chatroom,
    ConversationsList
  },
  computed: {
    ...mapGetters([
      'groupsByName'
    ]),
    channels () {
      console.log(groupB.members)

      return {
        order: groupA.channelsOrder,
        conversations: groupA.channels
      }
    },
    members () {
      return {
        order: groupA.members,
        conversations: users
      }
    }
  }
}
</script>
