<template>
  <div class="c-send">
    <textarea class="c-send-textarea"
      ref="textarea"
      :disabled="loading"
      :placeholder="customSendPlaceholder"
      :style="textAreaStyles"
      @keyup="handleKeyup"
      v-bind="$attrs"
    ></textarea>
    <div class="level is-mobile is-marginless c-send-actions" ref="actions">
      <i18n tag="button"
        class="has-text-weight-bold has-text-primary is-size-6 c-send-btn"
        @click="handleSendClick"
      >Send</i18n>
    </div>
    <div class="c-send-mask" ref="mask"></div>
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
    border: 1px solid $grey-light;
    border-radius: $radius;
    padding: $gi-spacer-sm $gi-spacer-lg $gi-spacer-xs $gi-spacer-sm;
    line-height: 1.3;
    height: $initialHeight;
    font-size: 1rem;
  }

  &-actions {
    position: absolute;
    top: 0;
    right: $gi-spacer-sm;
    height: 100%;
  }

  &-btn {
    padding: $gi-spacer-sm;
    height: 100%;
  }

  &-mask {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
    pointer-events: none;
    height: auto;
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
        maskHeight: ''
      }
    }
  },
  mounted () {
  //   console.log('...')
  //   this.config.actionsWidth = this.$refs.actions.offsetWidth
  //   this.config.textareaInitialHeight = this.$refs.textarea.offsetHeight
  //
    this.$refs.mask.textContent = this.$refs.textarea.value
    this.ephemeral.maskHeight = this.$refs.mask.offsetHeight
    this.ephemeral.actionsWidth = this.$refs.actions.offsetWidth
  },
  computed: {
    textAreaStyles () {
      console.log('calculate textarea')
      // alMOST. add padding to mask and same font size
      return {
        paddingRight: this.ephemeral.actionsWidth + 'px',
        height: this.ephemeral.maskHeight + 'px'
      }
    }
  },
  methods: {
    handleSendClick () {
      this.$emit('send', this.$refs.textarea.value)
      this.$refs.textarea.value = ''
    },
    handleKeyup (e) {
      this.$refs.mask.textContent = this.$refs.textarea.value
      this.ephemeral.maskHeight = this.$refs.mask.offsetHeight
      console.log('handleKeyup')
    }
  }
}
</script>
