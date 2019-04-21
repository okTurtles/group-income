<template lang='pug'>
.field
  label.label(v-if='label')
    i18n {{ label }}

  .control.has-icon
    input.input(
      type='password'
      :id='name'
      :class="{'is-danger': v[name].$error}"
      :name='name'
      :placeholder='name'
      :data-test='name'
      v-model='value[name]'
      @input="v[name].$touch()"
    )
    span.icon
      i.fas.fa-lock

  i18n.help.is-danger(
    v-show='v[name].$error'
    data-test='badPassword'
  ) {{ v[name].$error }}
</div>
</template>

<script>
export default {
  name: 'FormPassword',
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
    }
  },
  watch: {
    value () {
      this.$emit('input', this.value)
    }
  }
}
</script>
