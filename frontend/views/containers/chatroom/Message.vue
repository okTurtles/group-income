<template lang='pug'>
message-base(
  v-bind='$props'
  @add-emoticon='addEmoticon($event)'
  @reply='reply'
  @message-edited='editMessage'
  @delete-message='deleteMessage'
)

</template>

<script>
import {
  MESSAGE_VARIANTS
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path
import MessageBase from './MessageBase.vue'

export default ({
  name: 'Message',
  components: {
    MessageBase
  },
  props: {
    type: String,
    text: String,
    who: String,
    currentUsername: String,
    avatar: String,
    datetime: {
      type: Date,
      required: true
    },
    edited: Boolean,
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
    editMessage (newMessage) {
      this.$emit('edit-message', newMessage)
    },
    deleteMessage () {
      this.$emit('delete-message')
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
