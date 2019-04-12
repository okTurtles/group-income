<template lang='pug'>
.field
  p.control.has-icon
    input.input(
      :class="{'is-danger': v.password.$error}"
      id='password'
      name='password'
      v-model='value.password'
      @input="v.password.$touch()"
      placeholder='password'
      type='password'
      data-test='password'
    )
    span.icon
      i.fas.fa-lock

  i18n.help.is-danger(
    v-show='v.password.$error'
    data-test='badPassword'
  )
    | password must be at least 7 characters
</div>
</template>

<script>
export default {
  name: 'FormPassword',
  props: {
    value: { type: Object },
    v: { type: Object }
  },
  watch: {
    value () {
      this.$emit('input', this.value)
    }
  }
}
</script>
