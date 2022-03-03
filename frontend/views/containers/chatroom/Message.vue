<template lang='pug'>
message-base(
  v-bind='$props'
  @add-emoticon='addEmoticon($event)'
  @reply='reply'
)

</template>

<script>
import MessageBase from './MessageBase.vue'

const variants = {
  SENT: 'sent',
  RECEIVED: 'received',
  PENDING: 'pending',
  FAILED: 'failed'
}

export default ({
  name: 'Message',
  components: {
    MessageBase
  },
  props: {
    type: String,
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
        return [variants.SENT, variants.RECEIVED, variants.PENDING, variants.FAILED].indexOf(value) !== -1
      }
    },
    emoticonsList: {
      type: Object,
      default: null
    },
    isSameSender: Boolean,
    isCurrentUser: Boolean,
    replyingMessage: null
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
      this.$emit('add-emoticon', emoticon)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
