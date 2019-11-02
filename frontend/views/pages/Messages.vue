<template lang='pug'>
page(pageTestName='messages' pageTestHeaderName='messages')
  template(#title='') {{ L('Messages') }}
  template(#sidebar='')
    chat-nav(
      :title='L("Messages")'
      :search-placeholder='L("Search for a person")'
    )
      conversations-list(
        :title='L("Messages")'
        :list='messages'
        route-name='MessagesConversation'
        :type='type'
      )

  chat-main(
    :summary='summary'
    :details='details'
  )
</template>

<script>
import { mapGetters } from 'vuex'
import Page from '@pages/Page.vue'
import { chatTypes, individualMessagesSorted, users } from '@containers/chatroom/fakeStore.js'
import ChatNav from '@components/Chatroom/ChatNav.vue'
import ChatMain from '@components/Chatroom/ChatMain.vue'
import chatroom from '@containers/chatroom/chatroom.js'
import GroupsShortcut from '@components/Chatroom/GroupsShortcut.vue'
import ConversationsList from '@components/Chatroom/ConversationsList.vue'

export default {
  name: 'Messages',
  mixins: [
    chatroom
  ],
  components: {
    Page,
    ChatNav,
    ChatMain,
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
@import "@assets/style/_variables.scss";

</style>
