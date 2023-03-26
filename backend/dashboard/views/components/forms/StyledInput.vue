<template lang="pug">
label.inputgroup
  span.input-label(v-if='label') {{ label }}
  input.input(
    ref='input'
    type='text'
    :value='value'
    :placeholder='placeholder'
    @input='onInput'
    @blur='$emit("blur")'
    v-focus='autofocus'
  )
</template>

<script>
export default {
  name: 'StyledInput',
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
