<template lang='pug'>
fieldset
  legend.has-text-bold.c-legend
    i18n Payment info
    | &nbsp;
    i18n.has-text-1.has-text-small (optional)
  i18n.has-text-1 Other group members will be able to use this information to send you monthly contributions.

  .c-methods
    label.c-field(
      v-for='(method, index) in ephemeral.methodsCount'
      :key='`method-${index}`'
      data-test='method'
    )
      i18n.sr-only Payment info
      .select-wrapper.is-reversed.is-shifted
        select.select
          i18n(tag='option' selected='true' disabled='true') Choose...
          option(v-for='name of config.options') {{name}}
        input.input
        button.is-icon-small.is-btn-shifted(:aria-label='L("Remove method")')
          i.icon-times
</template>

<script>
import L from '@view-utils/translations.js'

export default {
  name: 'PaymentMethods',
  components: {},
  props: {
    // @select - emit
  },
  data: () => ({
    config: {
      options: ['Bitcoin', 'Paypal', 'Venmo', L('Other')]
    },
    ephemeral: {
      methodsCount: 1
    }
  }),
  computed: {}
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-legend {
  margin-bottom: $spacer-xs;
}

.c-methods {
  margin-top: $spacer-sm;
}

.c-field {
  display: block;
  margin-bottom: $spacer;
}
</style>
