<template lang='pug'>
.field
  i18n.label(tag='label' v-if='label') {{ label }}
  .input-combo
    input.input(
      :type="isLock ? 'password' : 'text'"
      :id='name'
      :class="[{'error': v[name].$error}, size]"
      :name='name'
      :placeholder="showPlaceholder ? name : ''"
      :data-test='name'
      v-model='value[name]'
      @input='v[name].$touch()'
    )
    button.is-icon(
      type="button"
      v-if='hasIconRight'
      @click.prevent='isLock = !isLock'
    )
      i(:class="isLock ? 'icon-eye' : 'icon-eye-slash'")

  i18n.error(
    tag='p'
    v-show='v[name].$error'
    data-test='badPassword'
  ) {{ v[name].$error }}
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
    v: {
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
  },
  watch: {
    value () {
      this.$emit('input', this.value)
    }
  }
}
</script>

<style lang="scss" scoped>
  .icon {
    cursor: pointer;
    pointer-events: initial !important;
  }
</style>
