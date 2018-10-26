<template>
  <chatroom>
    <p>Groups Chat Shortcut</p>

    <hr />
    <p>Private Messages</p>
    <ul>
      <li>GIBot</lsi>
      <li>zzz</li>
      <li>zzz</li>
      <li>zzz</li>
      <li>zzz</li>
      <li>zzz</li>
    </ul>
  </chatroom>
</template>
<style lang="scss" scoped>
@import "../assets/sass/theme/index";
</style>
<script>
import Chatroom from './components/Chatroom/Chatroom.vue'

export default {
  name: 'GroupChat',
  components: {
    Chatroom
  },
  data () {
    return {
      fakeStore: {
        privateMessages: [ 333, 111, 222, 444, 555 ],
        users: {
          111: { username: 'johnn', name: 'John M', avatar: '', hasUnred: false },
          222: { username: 'hlenon', name: 'Hugo Lenon', avatar: '', hasUnred: false },
          333: { username: 'liliabt', name: 'Lilia Bouvet', avatar: '', hasUnred: true },
          444: { username: 'ricky.ricky', name: 'Rick Eggs', avatar: '', hasUnred: false },
          555: { username: 'eric.rock', name: 'Eric Rock', avatar: '', hasUnred: false }
        }
      }
    }
  },
  computed: {},
  methods: {}
}
</script>
