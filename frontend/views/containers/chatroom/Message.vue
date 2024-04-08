<template lang='pug'>
message-base(
  v-bind='$props'
  @add-emoticon='addEmoticon($event)'
  @reply='$emit("reply")'
  @retry='$emit("retry")'
  @reply-message-clicked='$emit("scroll-to-replying-message")'
  @message-edited='editMessage'
  @delete-attachment='deleteAttachment'
  @delete-message='$emit("delete-message")'
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
      default: function () {
        return null
      }
    },
    isSameSender: Boolean,
    isMsgSender: Boolean,
    replyingMessage: String
  },
  methods: {
    editMessage (newMessage) {
      this.$emit('edit-message', newMessage)
    },
    deleteAttachment (manifestCid) {
      this.$emit('delete-attachment', manifestCid)
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
