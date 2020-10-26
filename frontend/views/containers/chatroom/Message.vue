<template lang='pug'>
message-base(
  v-bind='$props'
  @addEmoticon='addEmoticon($event)'
  @reply='reply'
)

</template>

<script>
import MessageBase from './MessageBase.vue'

const variants = {
  SENT: 'sent',
  RECEIVED: 'received',
  FAILED: 'failed'
}

export default {
  name: 'Message',
  components: {
    MessageBase
  },
  props: {
    text: String,
    who: String,
    currentUserId: String,
    avatar: String,
    time: {
      type: Date,
      required: true
    },
    variant: {
      type: String,
      validator (value) {
        return [variants.SENT, variants.RECEIVED, variants.FAILED].indexOf(value) !== -1
      }
    },
    emoticonsList: {
      type: Object,
      default: null
    },
    isSameSender: Boolean,
    isCurrentUser: Boolean
  },
  constants: Object.freeze({
    variants
  }),
  methods: {
    edit () {
      this.$emit('edit')
    },
    reply () {
      this.$emit('reply')
    },
    moreOptions () {
      console.log('TODO MORE OPTIONS')
    },
    copyToClipBoard () {
      navigator.clipboard.writeText(this.text)
    },
    addEmoticon (emoticon) {
      this.$emit('addEmoticon', emoticon)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
