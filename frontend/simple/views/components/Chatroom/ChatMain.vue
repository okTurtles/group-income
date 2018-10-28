<template>
  <div class="c-chatmain is-flex" v-if="info">
    <header class="level is-marginless c-header">
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
    <div class="c-body is-flex">
      <template v-for="(message, index) in conversation">
        <message
          :who="who(message.from)"
          :avatar="avatar(message.from)"
          :variant="variant(message.from)"
          :isSameSender="isSameSender[index]"
          :hideWho="false && info.type !== 'messages'"
        >
          {{message.text}}
        </message>

        <!-- TODO message Interactive -->

        <!-- TODO message from GIBot -->

        <!-- TODO message not sent -->
      </template>
    </div>
    <div class="c-footer">
      <!-- TODO - reuse Contribution's input markup here when #482 is merged -->
      <div class="field has-addons is-fullwidth">
        <p class="control is-expanded">
          <input class="input c-input" type="text" :placeholder="customSendPlaceholder">
        </p>
        <p class="control">
          <button class="button">
            Send
          </button>
        </p>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-chatmain {
  flex-grow: 1;
  flex-direction: column;
}

.c-header {
  padding: $gi-spacer;
  border-bottom: 1px solid $grey-lighter;
  min-height: 4.5rem;
}

.c-body {
  flex-grow: 1;
  flex-direction: column;
  justify-content: flex-end;
}

.c-footer {
  padding: $gi-spacer;

  .input {
    height: 40px;
  }
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
    return {
      config: {
        sendPlaceholder: [this.L('Be nice to'), this.L('Be cool to'), this.L('Have fun with')]
      }
    }
  },
  computed: {
    isSameSender () {
      return this.conversation.map((message, key) => {
        /* const sameAsNext = message.from === (this.conversation[key + 1] && this.conversation[key + 1].from) */
        const sameAsPrev = message.from === (this.conversation[key - 1] && this.conversation[key - 1].from)

        return sameAsPrev
      })
    },
    currentUserAttr () {
      return {
        ...this.$store.getters.currentUserIdentityContract.attributes,
        id: currentUserId
      }
    },
    customSendPlaceholder () {
      return `${this.config.sendPlaceholder[Math.floor(Math.random() * this.config.sendPlaceholder.length)]} ${this.info.title}`
    }
  },
  methods: {
    who (fromId) {
      if (this.currentUserAttr.id === fromId) {
        return this.currentUserAttr.displayName || this.currentUserAttr.name
      }

      const user = this.info.participants[fromId]

      return user.displayName || user.name
    },
    variant (fromId) {
      return this.currentUserAttr.id === fromId ? 'sent' : 'received'
    },
    avatar (fromId) {
      return this.currentUserAttr.id === fromId
        ? this.currentUserAttr.picture
        : this.info.participants[fromId].picture
    }
  }
}
</script>
