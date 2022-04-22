<template lang='pug'>
message-base(
  v-bind='$props'
  @add-emoticon='addEmoticon($event)'
  @reply='reply'
)

</template>

<script>
import MessageBase from './MessageBase.vue'
import { MESSAGE_VARIANTS } from '@model/contracts/constants.js'

export default ({
  name: 'Message',
  components: {
    MessageBase
  },
  props: {
    text: String,
    who: String,
    currentUserId: String,
    avatar: String,
    datetime: {
      type: Date,
      required: true
    },
    variant: {
      type: String,
      validator (value) {
        return Object.values(MESSAGE_VARIANTS).indexOf(value) !== -1
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
    variants: MESSAGE_VARIANTS
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
