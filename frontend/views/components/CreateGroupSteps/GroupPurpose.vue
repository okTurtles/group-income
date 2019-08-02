<template lang="pug">
div
  i18n.steps-title(tag='p') 2. Group Purpose

  i18n.label(tag='label') How would you describe your group?

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
