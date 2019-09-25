<template lang='pug'>
div(data-test='groupMincome')
  i18n.title.is-4(tag='h4') Minimum Income

  p.title.is-2.income(data-test='minIncome')
    | {{ currency }}{{ groupSettings.incomeProvided }}

  i18n.link(
    tag='button'
    :aria-label='L("Change Mincome")'
    @click='openProposal'
  ) Change
</template>

<script>
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'
import currencies from '@view-utils/currencies.js'
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'GroupMincome',
  computed: {
    currency () {
      return currencies[this.groupSettings.incomeCurrency]
    },
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupSettings'
    ])
  },
  methods: {
    openProposal () {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'MincomeProposal')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.income {
  margin: $spacer-xs 0;
}
</style>
