<template>
  <main class="c-chatroom">
    <chat-nav>
      <h1>Messages</h1>
      <slot></slot>
    </chat-nav>
    <chat-main>
      Main here....
      <!-- TODO If no chatType exist, show last one and redirect -->
      <!-- <component :is="chatType" /> -->
    </chat-main>
  </main>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-chatroom {
  padding: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
}
</style>
<script>
import ChatMain from './ChatMain.vue'
import ChatNav from './ChatNav.vue'

export default {
  name: 'Chatroom',
  components: {
    ChatMain,
    ChatNav
  },
  data () {
    return {}
  },
  computed: {},
  methods: {}
}
</script>
