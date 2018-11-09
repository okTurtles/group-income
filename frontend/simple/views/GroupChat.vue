<template>
  <chatroom
    :title="L('Chat')"
    :searchPlaceholder="L('Search for a channel')"
  >
    <template slot="nav">
      <!-- TODO add lock/world icon before -->
      <conversations-list
        :title="L('Channels')"
        routePath="/group-chat/"
        :list="channels"
        routeName="GroupChatConversation"
        :type="type.groups"
      />

      <conversations-list
        :title="L('Members')"
        :list="members"
        routeName="GroupChatConversation"
        :type="type.members"
      />
    </template>
  </chatroom>
</template>
<style lang="scss" scoped>
@import "../assets/sass/theme/index";

</style>
<script>
import { mapGetters } from 'vuex'
import { chatTypes, users, groupA } from './containers/Chatroom/fakeStore.js'
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
      return {
        order: groupA.channelsSorted,
        conversations: groupA.channels
      }
    },
    members () {
      return {
        order: groupA.members,
        conversations: users
      }
    },
    type () {
      return {
        members: chatTypes.INDIVIDUAL,
        groups: chatTypes.GROUP
      }
    }
  }
}
</script>
