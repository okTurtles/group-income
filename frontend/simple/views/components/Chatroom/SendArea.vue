<template>
  <div class="c-send">
    <textarea class="textarea c-send-textarea"
      ref="textarea"
      :disabled="loading"
      :placeholder="customSendPlaceholder"
      :style="textareaStyles"
      @keydown="handleKeydown"
      @keydown.enter.prevent
      v-bind="$attrs"
    ></textarea>
    <div class="level is-mobile is-marginless c-send-actions" ref="actions">
      <i18n tag="button"
        :class="{ isVisible }"
        class="button gi-is-unstyled has-text-weight-bold c-send-btn"
        @click="sendMessage"
      >Send</i18n>
    </div>
    <div class="textarea c-send-mask" ref="mask" :style="maskStyles"></div>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

$initialHeight: 2.5rem;

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
    padding: $gi-spacer-sm;
    padding-right: $gi-spacer;
    color: $primary;
    height: 100%;
    opacity: 0;
    pointer-events: none;

    &:focus {
      box-shadow: none;
      color: $text;
    }

    &.isVisible {
      opacity: 1;
      pointer-events: initial;
    }
  }
}
</style>
<script>
export default {
  name: 'Chatroom',
  components: {},
  props: {
    title: String,
    searchPlaceholder: String
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
    isVisible () {
      // REVIEW - should it always be visible or only when it has text?
      return true // !!this.ephemeral.textWithLines
    },
    customSendPlaceholder () {
      return `${this.config.sendPlaceholder[Math.floor(Math.random() * this.config.sendPlaceholder.length)]} ${this.title}`
    }
  },
  // TODO - MODAL USE keydown.esc
  methods: {
    handleKeydown (e) {
      const enterKey = e.keyCode === 13

      if ((e.shiftKey || e.altKey || e.ctrlKey) && enterKey) {
        return this.createNewLine()
      } else if (enterKey) {
        return this.sendMessage()
      } else {
        this.updateTextArea()
      }
    },
    updateTextWithLines () {
      this.ephemeral.textWithLines = this.$refs.textarea.value.replace(/\n/g, '<br>')
    },
    updateTextArea () {
      this.updateTextWithLines()

      const length = this.ephemeral.textWithLines.length
      const isLastLineEmpty = this.ephemeral.textWithLines.substring(length - 4, length) === '<br>'

      // TRICK: Use an invisible element (.mask) as placeholder to know the
      // amount of space the user message takes... (taking in account new lines)
      this.$refs.mask.innerHTML = this.ephemeral.textWithLines + (isLastLineEmpty ? '.' : '')

      // ...and apply the maks's height to the textarea so it dynamically grows as the user types
      this.ephemeral.maskHeight = this.$refs.mask.offsetHeight

      // ... finaly inform the parent about the new height to adjust the layout
      this.$emit('heightUpdate', this.ephemeral.maskHeight + 'px')
    },
    createNewLine () {
      this.$refs.textarea.value += '\n'
      this.updateTextArea()
    },
    sendMessage () {
      if (!this.ephemeral.textWithLines) {
        return false
      }

      this.updateTextWithLines()
      this.$emit('send', this.ephemeral.textWithLines) // TODO remove first / last lines when empty
      this.$refs.textarea.value = ''
      this.updateTextArea()
    }
  }
}
</script>
