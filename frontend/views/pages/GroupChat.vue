<template lang='pug'>
page(pageTestName='dashboard' pageTestHeaderName='groupName')
  template(#title='')
    .c-header
      i(
        v-if='summary.private !== undefined'
        :class='`icon-${ summary.private ? "lock" : "hashtag" }`'
      )
      | {{summary.title}}
  template(#description='') {{ members.size + ' ' + L('members') }} ∙ {{ summary.description }}
  template(#sidebar='')
    chat-nav(
      :title='L("Chat")'
    )
      conversations-list(
        :title='L("Channels")'
        routepath='/group-chat/'
        :list='channels'
        route-name='GroupChatConversation'
        :type='type.groups'
      )

      group-members(:title='L("Direct Messages")' action='chat')

  .card.c-card
    chat-main(
      :summary='summary'
      :details='details'
      :type='type.groups'
    )
</template>

<script>
import { mapGetters } from 'vuex'
import Page from '@components/Page.vue'
import { chatTypes, users, groupA } from '@containers/chatroom/fakeStore.js'
import ConversationsList from '@containers/chatroom/ConversationsList.vue'
import ChatNav from '@containers/chatroom/ChatNav.vue'
import ChatMain from '@containers/chatroom/ChatMain.vue'
import chatroom from '@containers/chatroom/chatroom.js'
import GroupMembers from '@containers/dashboard/GroupMembers.vue'

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
        conversations: users,
        size: groupA.members.length
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
@import "@assets/style/_variables.scss";

.c-card {
  margin-top: 1.5rem;
  padding: 0 2.5rem 1.5rem 2.5rem;
}

.c-header {
  i {
    margin-right: 0.5rem;
    color: $text_1;
  }
}
</style>
