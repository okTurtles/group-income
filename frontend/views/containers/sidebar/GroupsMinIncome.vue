<template lang='pug'>
div
  i18n.title.is-4(tag='h4') Minimum Income

  p.title.is-2.income-provided(data-test='minIncome')
    | {{ currency }}{{ groupSettings.incomeProvided }}

  i18n.link(
    tag='button'
    :aria-label='L("Change Mincome")'
    @click='openProposal'
  ) Change
  br
  i18n.link(
    tag='button'
    @click='changeMin'
  ) Increase {{ currency }}10
</template>

<script>
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'
import currencies from '@view-utils/currencies.js'
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'GroupsMinIncome',
  computed: {
    currency: function () {
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
    },
    async changeMin () {
      const updatedSettings = await sbp('gi.contracts/group/updateSettings/create',
        {
          incomeProvided: this.groupSettings.incomeProvided + 10
        },
        this.currentGroupId // NOTE 1: why do i need to pass currentGroupId?
        // Actually, I understand why, to give context... but, how would I know it?
        // When reading the selector at group.js, that's expecting state, data, meta,
        // but not a groupId... It took me a **while** to realize that
        // when I call this selector, it actually calls Contract.js 'selectors/register'
        // first and only then it calls GIMessage.create() (what for?)
      )

      // NOTE: I was expecting "updateSettings/process" to be called by now...
      // but it didn't happen. Then I realized I also had to call publishLogEntry. Why?
      await sbp('backend/publishLogEntry', updatedSettings)
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
