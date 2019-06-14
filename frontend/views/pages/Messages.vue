<template lang="pug">
page(pageTestName='messages' pageTestHeaderName='messages')
  template(#title='') Messages
  template(#sidebar='')
    chat-nav(
      :title="L('Messages')"
      :searchplaceholder="L('Search for a person')"
    )
      conversations-list(
        :title="L('Messages')"
        :list='messages'
        routename='MessagesConversation'
        :type='type'
      )

  .p-section
    chat-main(
      :summary='summary'
      :details='details'
    )

</template>

<script>
import { mapGetters } from 'vuex'
import Page from '@pages/Page.vue'
import { chatTypes, individualMessagesSorted, users } from '@containers/chatroom/fakeStore.js'
import ChatNav from '@components/chatroom/ChatNav.vue'
import ChatMain from '@components/chatroom/ChatMain.vue'
import chatroom from '@containers/chatroom/chatroom.js'
import GroupsShortcut from '@components/chatroom/GroupsShortcut.vue'
import ConversationsList from '@components/chatroom/ConversationsList.vue'

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
@import "../../assets/style/_variables.scss";

</style>
