<template lang='pug'>
label.field
  .label(v-if='label') {{ label }}
  .input-combo(
    v-error:[name]='{ attrs: { "data-test": "badPassword" }}'
  )
    input.input(
      :type='isLock ? "password" : "text"'
      :class='[{error: $v.form[name].$error}, size]'
      :placeholder='showPlaceholder ? name : ""'
      :name='name'
      :data-test='name'
      v-model='$v.form[name].$model'
      @input='debounceField("password")'
      @blur='updateField("password")'
    )
    button.is-icon(
      type='button'
      v-if='hasIconRight'
      :aria-label='L("Toggle password visibility")'
      :aria-pressed='!isLock'
      @click.prevent='isLock = !isLock'
    )
      i(:class='isLock ? "icon-eye" : "icon-eye-slash"')
</template>

<script>
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'

export default {
  name: 'PasswordForm',
  data () {
    return {
      isLock: true
    }
  },
  mixins: [validationsDebouncedMixins],
  props: {
    name: {
      type: String,
      required: false,
      default: 'password'
    },
    label: {
      type: String,
      required: false
    },
    $v: {
      type: Object,
      required: true
    },
    hasIconRight: {
      type: Boolean,
      default: true
    },
    showPlaceholder: {
      type: Boolean,
      default: false
    },
    showPassword: {
      type: Boolean,
      default: false
    },
    size: {
      type: String,
      required: false
    }
  },
  created () {
    this.isLock = !this.showPassword
  }
}
</script>

<style lang="scss" scoped>
  .icon {
    cursor: pointer;
    pointer-events: initial !important;
  }
</style>
