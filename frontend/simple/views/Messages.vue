<template>
  <chatroom title="Messages">
    <input class="input" type="text" placeholder="Search for a conversation">
    <groups-shortcut class="c-message-list" />
    <private-messages :list="privateMessages" class="c-message-list" />
  </chatroom>
</template>
<style lang="scss" scoped>
@import "../assets/sass/theme/index";

.c-message-list {
  margin: $gi-spacer*1.5 0;
}

</style>
<script>
import Chatroom from './components/Chatroom/Chatroom.vue'
import GroupsShortcut from './containers/Chatroom/GroupsShortcut.vue'
import PrivateMessages from './components/Chatroom/PrivateMessages.vue'

export default {
  name: 'Messages',
  components: {
    Chatroom,
    GroupsShortcut,
    PrivateMessages
  },
  data () {
    return {}
  },
  computed: {
    privateMessages () {
      return {
        timeOrder: [555, 333, 444, 111, 222],
        users: {
          111: { username: 'johnn', name: 'John Mars', avatar: 'http://localhost:8000/simple/assets/images/default-avatar.png', unreadCount: 0 },
          222: { username: 'hlenon', name: 'Hugo Lenon', avatar: 'http://localhost:8000/simple/assets/images/default-avatar.png', unreadCount: 0 },
          333: { username: 'liliabt', name: 'Lilia Bouvet', avatar: 'http://localhost:8000/simple/assets/images/default-avatar.png', unreadCount: 2 },
          444: { username: 'rickyricky', name: 'Rick Eggs', avatar: 'http://localhost:8000/simple/assets/images/default-avatar.png', unreadCount: 0 },
          555: { username: 'ericrock', name: 'Eric Rock', avatar: 'http://localhost:8000/simple/assets/images/default-avatar.png', unreadCount: 1 }
        }
      }
    }
  },
  methods: {}
}
</script>
