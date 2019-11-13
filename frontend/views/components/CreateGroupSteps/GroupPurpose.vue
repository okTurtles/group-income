<template lang='pug'>
.wrapper
  i18n.steps-title(tag='h4') 2. Group Purpose

  .card
    i18n.label(tag='label') How would you describe your group?

    textarea.textarea(
      name='sharedValues'
      ref='purpose'
      :placeholder='L("Group Purpose")'
      maxlength='500'
      :class='{ error: vForm.sharedValues.$error }'
      :value='group.sharedValues'
      @input='update'
    )
    slot
</template>

<script>
export default {
  name: 'GroupPurpose',
  props: {
    group: { type: Object },
    vForm: { type: Object }
  },
  mounted () {
    this.$refs.purpose.focus()
  },
  methods: {
    update (e) {
      this.vForm.sharedValues.$touch()
      this.$emit('input', {
        data: {
          sharedValues: e.target.value
        }
      })
    }
  }
}
</script>
