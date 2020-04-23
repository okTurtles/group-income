<template lang='pug'>
.wrapper
  i18n.is-title-4.steps-title(tag='h4') 2. Group Purpose

  .card
    i18n.label(tag='label') How would you describe your group?

    .field
      textarea.textarea(
        name='sharedValues'
        ref='purpose'
        :placeholder='L("Group Purpose")'
        maxlength='500'
        :class='{ error: $v.form.sharedValues.$error }'
        :value='group.sharedValues'
        @input='update'
      )
      i18n.helper This is optional.

    slot
</template>

<script>
export default {
  name: 'GroupPurpose',
  props: {
    group: { type: Object },
    $v: { type: Object }
  },
  mounted () {
    this.$refs.purpose.focus()
  },
  methods: {
    update (e) {
      this.$v.form.sharedValues.$touch()
      this.$emit('input', {
        data: {
          sharedValues: e.target.value
        }
      })
    }
  }
}
</script>
