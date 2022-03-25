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

const individualMessagesSorted = ['GIBot', 555, 333, 444, 111, 222]
const users = {
  'GIBot': {
    id: 'GIBot',
    name: 'gibot',
    displayName: 'GIBot',
    picture: '/assets/images/group-income-icon-transparent-circle.png',
    unreadCount: 1,
    description: 'I’m here to keep you update while you are away'
  },
  '111': {
    id: '111',
    name: 'johnn',
    displayName: 'John Mars',
    picture: '/assets/images/user-avatar-default.png',
    unreadCount: 0,
    description: 'You and John are both part of Dreamers group'
  },
  '222': {
    id: '222',
    name: 'hlenon',
    displayName: 'Hugo Lenon',
    picture: '/assets/images/user-avatar-default.png',
    unreadCount: 0,
    description: null
  },
  '333': {
    id: '333',
    name: 'liliabt',
    displayName: 'Lilia Bouvet',
    picture: '/assets/images/user-avatar-default.png',
    unreadCount: 0,
    description: null
  },
  '444': {
    id: '444',
    name: 'rickyricky',
    displayName: 'Rick Eggs',
    picture: '/assets/images/user-avatar-default.png',
    unreadCount: 0,
    description: null
  },
  '555': {
    id: '555',
    name: 'ericrock',
    displayName: 'Eric Rock',
    picture: '/assets/images/user-avatar-default.png',
    unreadCount: 1,
    description: 'You and Eric are both part of Dreamers group'
  }
}

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
        order: individualMessagesSorted,
        conversations: users
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
