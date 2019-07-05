<template lang="pug">
div
  p.steps-title
    | 2.&nbsp;
    i18n Group Purpose

  label.label
    i18n How would you describe your group?

  textarea.textarea(
    name='sharedValues'
    ref='purpose'
    placeholder='Group Purpose'
    maxlength='500'
    :class="{ 'error': v.sharedValues.$error }"
    :value='group.sharedValues'
    @input='update'
  )
</template>

<script>
export default {
  name: 'GroupPurpose',
  props: {
    group: { type: Object },
    v: { type: Object }
  },
  mounted () {
    this.$refs.purpose.focus()
  },
  methods: {
    update (e) {
      this.v.sharedValues.$touch()
      this.$emit('input', {
        data: {
          sharedValues: e.target.value
        }
      })
    }
  }
}
</script>
