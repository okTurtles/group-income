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
import Page from '@components/Page.vue'
import { CHATROOM_TYPES } from '@model/contracts/constants.js'
import ChatNav from '@containers/chatroom/ChatNav.vue'
import ChatMain from '@containers/chatroom/ChatMain.vue'
import chatroom from '@containers/chatroom/chatroom.js'
import GroupsShortcut from '@containers/chatroom/GroupsShortcut.vue'
import ConversationsList from '@containers/chatroom/ConversationsList.vue'

export default ({
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
        order: [],
        conversations: []
      }
    },
    type () {
      return CHATROOM_TYPES.INDIVIDUAL
    }
  },
  methods: {
    handleGroupSelect (hash) {
      this.$store.commit('setCurrentGroupId', hash)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

</style>
