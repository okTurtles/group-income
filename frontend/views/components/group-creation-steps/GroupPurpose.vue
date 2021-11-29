<template lang='pug'>
.wrapper
  i18n.is-title-4.steps-title(tag='h4') 2. Group Purpose

  .card
    label.field
      i18n.label How would you describe your group?

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
export default ({
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
}: Object)
</script>
