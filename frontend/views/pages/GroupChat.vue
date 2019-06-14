<template lang="pug">
page(pageTestName='dashboard' pageTestHeaderName='groupName')
  template(#title='') Group Chat
  template(#sidebar='')
    chat-nav(
      :title="L('Chat')"
      :searchplaceholder="L('Search for a channel')"
    )
      conversations-list(
        :title="L('Channels')"
        routepath='/group-chat/'
        :list='channels'
        routename='GroupChatConversation'
        :type='type.groups'
      )

      group-members

  .p-section
    chat-main(
      :summary='summary'
      :details='details'
    )

</template>

<script>
import { mapGetters } from 'vuex'
import Page from '@pages/Page.vue'
import { chatTypes, users, groupA } from '@containers/chatroom/fakeStore.js'
import ConversationsList from '@components/chatroom/ConversationsList.vue'
import ChatNav from '@components/chatroom/ChatNav.vue'
import ChatMain from '@components/chatroom/ChatMain.vue'
import chatroom from '@containers/chatroom/chatroom.js'
import GroupMembers from '@containers/sidebar/GroupMembers.vue'

export default {
  name: 'GroupChat',
  mixins: [
    chatroom
  ],
  components: {
    Page,
    ChatNav,
    ChatMain,
    ConversationsList,
    GroupMembers
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
