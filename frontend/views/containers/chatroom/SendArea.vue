<template lang='pug'>
.c-send
  textarea.textarea.c-send-textarea(
    ref='textarea'
    :disabled='loading'
    :placeholder='customSendPlaceholder'
    :style='textareaStyles'
    @keydown.enter.exact='sendMessage'
    @keydown.ctrl='isNextLine'
    @keyup='handleKeyup'
    v-bind='$attrs'
  )

  .c-send-actions(ref='actions')
    i18n.button.c-send-btn(
      tag='button'
      :class='{ isActive }'
      @click='sendMessage'
    ) Send

  .textarea.c-send-mask(
    ref='mask'
    :style='maskStyles'
  )
</template>

<script>
export default {
  name: 'Chatroom',
  components: {},
  props: {
    title: String,
    searchPlaceholder: String,
    loading: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      config: {
        sendPlaceholder: [this.L('Be nice to'), this.L('Be cool to'), this.L('Have fun with')]
      },
      ephemeral: {
        actionsWidth: '',
        maskHeight: '',
        textWithLines: ''
      }
    }
  },
  mounted () {
    // Get actionsWidth to add a dynamic padding to textarea,
    // so those actions don't be above the textarea's value
    this.ephemeral.actionsWidth = this.$refs.actions.offsetWidth
    this.updateTextArea()
  },
  computed: {
    textareaStyles () {
      return {
        paddingRight: this.ephemeral.actionsWidth + 'px',
        height: this.ephemeral.maskHeight + 'px'
      }
    },
    maskStyles () {
      return {
        paddingRight: this.ephemeral.actionsWidth + 'px'
      }
    },
    isActive () {
      return this.ephemeral.textWithLines
    },
    customSendPlaceholder () {
      return `${this.config.sendPlaceholder[Math.floor(Math.random() * this.config.sendPlaceholder.length)]} ${this.title}`
    }
  },
  methods: {
    isNextLine (e) {
      const enterKey = e.keyCode === 13
      if ((e.shiftKey || e.altKey || e.ctrlKey) && enterKey) {
        return this.createNewLine()
      }
    },
    handleKeyup () {
      this.updateTextArea()
    },
    updateTextWithLines () {
      const newValue = this.$refs.textarea.value.replace(/\n/g, '<br>')
      if (this.ephemeral.textWithLines === newValue) {
        return false
      }

      this.ephemeral.textWithLines = newValue
      return true
    },
    updateTextArea () {
      if (!this.updateTextWithLines()) {
        // dont calculate again when the value is the same (ex: happens on shift+enter)
        return false
      }

      const length = this.ephemeral.textWithLines.length
      const isLastLineEmpty = this.ephemeral.textWithLines.substring(length - 4, length) === '<br>'

      // TRICK: Use an invisible element (.mask) as placeholder to know the
      // amount of space the user message takes... (taking in account new lines)
      this.$refs.mask.innerHTML = this.ephemeral.textWithLines + (isLastLineEmpty ? '.' : '')

      // ...and apply the maks's height to the textarea so it dynamically grows as the user types
      this.ephemeral.maskHeight = this.$refs.mask.offsetHeight - 2

      // ... finaly inform the parent about the new height to adjust the layout
      this.$emit('heightUpdate', this.ephemeral.maskHeight + 'px')
    },
    createNewLine () {
      this.$refs.textarea.value += '\n'
      this.updateTextArea()
    },
    sendMessage () {
      console.log('send')
      if (!this.$refs.textarea.value) {
        return false
      }

      this.$emit('send', this.$refs.textarea.value) // TODO remove first / last empty lines
      this.$refs.textarea.value = ''

      this.updateTextArea()
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

$initialHeight: 43px;

.c-send {
  position: relative;

  &-textarea,
  &-mask {
    display: block;
    width: 100%;
    min-height: $initialHeight;
    font-size: 1rem;
    word-wrap: break-word;
  }

  &-textarea {
    height: $initialHeight;
    resize: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &-mask {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
    pointer-events: none;
    height: auto;
  }

  &-actions {
    position: absolute;
    bottom: 0;
    right: 0;
    height: $initialHeight;
  }

  &-btn {
    padding: 0.5rem;
    padding-right: 1rem;
    color: $general_2;
    height: 100%;
    border-radius: 0 $radius $radius 0;

    &:focus {
      box-shadow: none;
      color: $text_1;
    }
  }
}
</style>
