<template>
  <div class="c-send">
    <textarea class="textarea c-send-textarea"
      ref="textarea"
      :disabled="loading"
      :placeholder="customSendPlaceholder"
      :style="textareaStyles"
      @keyup="handleKeyup"
      v-bind="$attrs"
    ></textarea>
    <div class="level is-mobile is-marginless c-send-actions" ref="actions">
      <i18n tag="button"
        :class="{ isVisible }"
        class="button gi-is-unstyled has-text-weight-bold c-send-btn"
        @click="handleSendClick"
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
      ephemeral: {
        actionsWidth: '',
        maskHeight: '',
        text: ''
      }
    }
  },
  mounted () {
    // Get actionsWidth to add a dynamic padding to textarea,
    // so those actions don't be above the textarea's value
    this.ephemeral.actionsWidth = this.$refs.actions.offsetWidth
    this.updateTextareaHeight()
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
      return !!this.ephemeral.text
    }
  },
  methods: {
    handleSendClick () {
      this.$emit('send', this.$refs.textarea.value)
      this.$refs.textarea.value = ''
      this.updateText()
      this.updateTextareaHeight()
    },
    handleKeyup (e) {
      this.updateText()
      this.updateTextareaHeight()
    },
    updateText () {
      this.ephemeral.text = this.$refs.textarea.value
    },
    updateTextareaHeight () {
      // TRICK: Use a invisible element (.mask) as placeholder to know the
      // amount of space the user message takes. Then apply the maks's height
      // to the textarea so it "dynamically" grows as she/he types
      this.$refs.mask.textContent = this.$refs.textarea.value
      this.ephemeral.maskHeight = this.$refs.mask.offsetHeight

      this.$emit('heightUpdate', this.ephemeral.maskHeight)
    }
  }
}
</script>
