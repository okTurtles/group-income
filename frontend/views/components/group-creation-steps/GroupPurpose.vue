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
        :class='{ error: isFieldError }'
        :value='group.sharedValues'
        v-error:sharedValues=''
        @input='update'
      )
      i18n.helper(v-if='!isFieldError') This is optional.

    slot
</template>

<script>
import { GROUP_DESCRIPTION_MAX_CHAR } from '@model/contracts/shared/constants.js'

export default ({
  name: 'GroupPurpose',
  props: {
    group: { type: Object },
    $v: { type: Object }
  },
  mounted () {
    this.$refs.purpose.focus()
  },
  data () {
    return {
      config: {
        maxChar: GROUP_DESCRIPTION_MAX_CHAR
      }
    }
  },
  computed: {
    isFieldError () {
      return this.$v.form.sharedValues.$error
    }
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
