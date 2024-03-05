<template lang='pug'>
message-base(
  v-bind='$props'
  @add-emoticon='addEmoticon($event)'
  @reply='reply'
  @reply-message-clicked='scrollToReplyMessage'
  @message-edited='editMessage'
  @delete-message='deleteMessage'
  :convertTextToMarkdown='true'
)

</template>

<script>
import MessageBase from './MessageBase.vue'
import { MESSAGE_VARIANTS } from '@model/contracts/shared/constants.js'

export default ({
  name: 'Message',
  components: {
    MessageBase
  },
  props: {
    height: Number,
    messageHash: String,
    type: String,
    text: String,
    attachments: Array,
    who: String,
    currentUserID: String,
    avatar: [Object, String],
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
    scrollToReplyMessage () {
      this.$emit('scroll-to-replying-message')
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
