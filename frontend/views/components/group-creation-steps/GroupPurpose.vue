<template lang='pug'>
.wrapper
  i18n.is-title-4.steps-title(tag='h4') 2. Group Purpose

  .card
    label.field.c-label
      .c-label-container
        i18n.label How would you describe your group?
        span.c-char-len(:class='{ "is-error": isFieldError }') {{ charLen }}

      textarea.textarea.c-textarea(
        name='sharedValues'
        ref='purpose'
        :placeholder='L("Group Purpose")'
        :maxlength='config.maxChar'
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
    },
    charLen () {
      const len = this.group.sharedValues?.length || 0
      return `${len}/${GROUP_DESCRIPTION_MAX_CHAR}`
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

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-label-container {
  position: relative;
  display: flex;
  column-gap: 0.5rem;
  align-items: flex-end;

  .label {
    flex-grow: 1;
  }

  .c-char-len {
    display: inline-block;
    line-height: $size_4;
    font-size: $size_5;
    color: $text_1;
    flex-shrink: 0;
    margin-bottom: 0.625rem;

    &.is-error {
      color: $danger_0;
    }
  }
}
</style>
