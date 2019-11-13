<template lang='pug'>
label.field(
  v-error:password=''
)
  .label(v-if='label') {{ label }}
  .input-combo
    input.input(
      :type='isLock ? "password" : "text"'
      :id='name'
      :class='[{error: vForm[name].$error}, size]'
      :name='name'
      :placeholder='showPlaceholder ? name : ""'
      :data-test='name'
      @input='e => $emit("input", e)'
      @blur='e => $emit("blur", e)'
    )
    button.is-icon(
      type='button'
      v-if='hasIconRight'
      @click.prevent='isLock = !isLock'
    )
      i(:class='isLock ? "icon-eye" : "icon-eye-slash"')

  i18n.error(
    v-show='vForm[name].$error'
    data-test='badPassword'
  ) {{ error }}
</template>

<script>
export default {
  name: 'FormPassword',
  data () {
    return {
      isLock: true
    }
  },
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
    value: {
      type: Object,
      required: true
    },
    vForm: {
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
    },
    error: {
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
