<template>
  <div class="c-chatmain" v-if="info">
    <header class="level c-header">
      <div class="level-left">
        <div>
          <h2 class="title is-size-5 is-marginless">{{ info.title }}</h2>
          <p class="is-size-7 has-text-grey">{{ info.description }}</p>
        </div>
      </div>
      <div class="level-right">
        <button class="button is-icon">
          <i class="fa fa-user-plus"></i>
        </button>
        <button class="button is-icon">
          <i class="fa fa-ellipsis-v"></i>
        </button>
      </div>
    </header>
    <div>
      <p>conversation on the way</p>
      <template v-for="(message, index) in conversation">
        <!-- TODO Later: dont duplicate avatar when consecutive messages are from the same sender -->
        <message
          :hasWho="info.type !== 'messages'"
          :who="who(message.from)"
          :avatar="avatar(message.from)"
          :variant="variant(message.from)">
          {{message.text}}
        </message>
      </template>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-chatmain {
  flex-grow: 1;
}

.c-header {
  padding: $gi-spacer;
  border-bottom: 1px solid $grey-lighter;
  min-height: 4.5rem;
}
</style>
<script>
import Message from './Message.vue'
import { currentUserId } from '../../containers/Chatroom/fakeStore.js'

export default {
  name: 'ChatMain',
  components: {
    Message
  },
  props: {
    info: Object,
    conversation: Array
  },
  data () {
    return {}
  },
  computed: {
    currentUserAttributes () {
      return this.$store.getters.currentUserIdentityContract.attributes
    }
  },
  methods: {
    who (fromId) {
      if (currentUserId === fromId) {
        return this.currentUserAttributes.displayName || this.currentUserAttributes.name
      }

      const user = this.info.participants[fromId]

      return user.displayName || user.name
    },
    variant (fromId) {
      return currentUserId === fromId ? 'sent' : 'received'
    },
    avatar (fromId) {
      return currentUserId === fromId
        ? this.currentUserAttributes.picture
        : this.info.participants[fromId].picture
    }
  }
}
</script>
