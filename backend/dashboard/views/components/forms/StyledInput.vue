<template lang="pug">
label.inputgroup(:class='{ "is-disabled": disabled }')
  span.input-label(v-if='label') {{ label }}

  char-limit-indicator.c-char-indicator(
    v-if='showLimitIndicator'
    :max='max'
    :current='value.length'
  )

  input.input(
    ref='input'
    type='text'
    :value='value'
    :placeholder='placeholder'
    :disabled='disabled'
    :maxlength='max > 0 ? max : undefined'
    @input='onInput'
    @blur='$emit("blur")'
    v-focus='autofocus'
  )
</template>

<script>
import CharLimitIndicator from '../CharLimitIndicator.vue'

export default {
  name: 'StyledInput',
  components: {
    CharLimitIndicator
  },
  props: {
    value: {
      type: String,
      required: false
    },
    label: {
      type: String,
      required: false
    },
    placeholder: {
      type: String,
      required: false,
      default: ''
    },
    autofocus: {
      type: Boolean,
      default: false
    },
    max: {
      type: Number,
      required: false
    },
    disabled: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  computed: {
    showLimitIndicator () {
      return this.max > 0 && this.value.length > 0
    }
  },
  methods: {
    focus () {
      this.$refs.input.focus()
    },
    onInput (e) {
      this.$emit('input', e.target.value)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-char-indicator {
  position: absolute;
  display: block;
  top: 0.75rem;
  right: 1.25rem;
  pointer-events: none;
  z-index: 1;
}
</style>
