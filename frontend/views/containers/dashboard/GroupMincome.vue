<template lang='pug'>
div(data-test='groupMincome')
  i18n.is-title-4(tag='h3') Minimum Income

  p.is-title-2.income(data-test='minIncome') {{ groupMincomeFormatted }}

  i18n.link(
    tag='button'
    :aria-label='L("Change Mincome")'
    @click='openProposal'
  ) Change
</template>

<script>
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'
import { mapGetters } from 'vuex'

export default ({
  name: 'GroupMincome',
  computed: {
    ...mapGetters([
      'groupSettings',
      'groupMincomeFormatted'
    ])
  },
  methods: {
    openProposal () {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'MincomeProposal')
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.income {
  margin: 0.25rem 0;
}
</style>
