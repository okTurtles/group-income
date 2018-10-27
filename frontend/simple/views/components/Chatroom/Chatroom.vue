<template>
  <main class="c-chatroom">
    <chat-nav :title="title">
      <slot></slot>
    </chat-nav>
    <router-view>
    </router-view>
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
  props: {
    title: String
  },
  data () {
    return {}
  },
  computed: {},
  methods: {}
}
</script>
