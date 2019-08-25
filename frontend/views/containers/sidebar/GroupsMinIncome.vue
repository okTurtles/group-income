<template lang="pug">
div
  i18n.title.is-4(tag='h4') Minimum Income

  p.title.is-2.income-provided(data-test='minIncome')
    | {{ currency }}{{ groupSettings.incomeProvided }}

  i18n.link(
    tag='button'
    aria-label="Change minIncome"
    @click='openProposal'
  ) Change
</template>

<script>
import sbp from '~/shared/sbp.js'
import { LOAD_MODAL } from '@utils/events.js'
import currencies from '@view-utils/currencies.js'
import { mapGetters } from 'vuex'

export default {
  name: 'GroupsMinIncome',
  computed: {
    currency: function () {
      return currencies[this.groupSettings.incomeCurrency]
    },
    ...mapGetters([
      'groupSettings'
    ])
  },
  methods: {
    openProposal () {
      sbp('okTurtles.events/emit', LOAD_MODAL, 'MincomeProposal')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.income-provided {
  margin: $spacer-xs 0;
}
</style>
