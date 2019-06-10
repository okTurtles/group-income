<template lang="pug">
page(pageTestName='dashboard' pageTestHeaderName='groupName' v-if='currentGroupState')
  template(#title='') Chat
  template(#sidebar='')

  chatroom(
    :title="L('Chat')"
    :searchplaceholder="L('Search for a channel')"
  )
    template(slot='nav')
      conversations-list(
        :title="L('Channels')"
        routepath='/group-chat/'
        :list='channels'
        routename='GroupChatConversation'
        :type='type.groups'
      )

      conversations-list(
        :title="L('Members')"
        :list='members'
        routename='GroupChatConversation'
        :type='type.members'
      )

</template>

<script>
import { mapGetters } from 'vuex'
import Page from '@pages/Page.vue'
import { chatTypes, users, groupA } from '@containers/chatroom/fakeStore.js'
import Chatroom from '@containers/chatroom/Chatroom.vue'
import ConversationsList from '@components/chatroom/ConversationsList.vue'

export default {
  name: 'GroupChat',
  components: {
    Page,
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

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

</style>
