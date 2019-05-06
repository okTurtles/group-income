<template lang='pug'>
.field
  label.label(v-if='label')
    i18n {{ label }}

  .control.has-icon(:class="{'has-icon-right': hasIconRight}")
    input.input(
      :type="isLock ? 'password' : 'text'"
      :id='name'
      :class="[{'is-danger': v[name].$error}, size]"
      :name='name'
      :placeholder="showPlaceholder ? name : ''"
      :data-test='name'
      v-model='value[name]'
      @input="v[name].$touch()"
    )
    span.icon(@click.stop="isLock = !isLock")
      i.fas(
        :class="isLock ? 'fa-eye' : 'fa-eye-slash'"
      )

  i18n.help.is-danger(
    v-show='v[name].$error'
    data-test='badPassword'
  ) {{ v[name].$error }}
</div>
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
      default: false
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
