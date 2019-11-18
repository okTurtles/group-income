<template lang='pug'>
//- TODO: Remove?
div
  h1.is-title-1(data-test='summaryStep')
    i18n Review &amp; Finish
  h2.subtitle
    i18n Group name:
  p(v-if='group.groupName') {{ group.groupName }}
  p.subtitle.is-5.has-text-danger(v-else='')
    i18n No group name set
  p.has-text-right
    router-link.button(:to="{name: 'GroupName'}")
      i18n Edit
  hr
  h2.subtitle
    i18n Group purpose:
  p(v-if='group.sharedValues') {{ group.sharedValues }}
  p.subtitle.is-5.has-text-danger(v-else='')
    i18n No group purpose set
  p.has-text-right
    router-link.button(:to="{name: 'GroupPurpose'}")
      i18n Edit
  hr
  h2.subtitle
    i18n Minimum income:
  p(v-if='group.mincomeAmount') {{ currency }}{{ group.mincomeAmount }}
  p.subtitle.is-5.has-text-danger(v-else='')
    i18n No group income set
  p.has-text-right
    router-link.button(:to="{name: 'GroupMincome'}")
      i18n Edit
  hr
  h2.subtitle
    i18n Group rules:
  .columns.has-text-centered
    .column
      p.percent {{ group.changeThreshold | toPercent }}
      p.subtitle.is-5
        i18n Change Rules
    .column
      p.percent {{ group.memberApprovalThreshold | toPercent }}
      p.subtitle.is-5
        i18n Add Member
    .column
      p.percent {{ group.memberRemovalThreshold | toPercent }}
      p.subtitle.is-5
        i18n Remove Member
  p.has-text-right
    router-link.button(:to="{name: 'GroupRules'}")
      i18n Edit
  hr
  h2.subtitle
    i18n Members to invite:
  p.subtitle.is-5.has-text-warning(v-if='!group.invitees.length')
    i18n No one invited
  .tile.is-ancestor
    .tile.is-title-4.is-parent(v-for='(invitee, index) in group.invitees' :key='`invitee-${index}`')
      .card.tile.is-child
        .card-image
          figure.image.is-square
            img(:src='invitee.state.attributes.picture' :alt='invitee.state.attributes.name')
        header.card-header
          p
            | {{invitee.state.attributes.name}}
  p.has-text-right
    router-link.button(:to="{name: 'GroupInvitees'}")
      i18n Edit
</template>

<script>
import currencies from '../../utils/currencies'
import { toPercent } from '../../utils/filters'
export default {
  name: 'GroupSummary',
  props: {
    group: { type: Object }
  },
  mounted () {
    this.$emit('focusref', 'finish')
  },
  computed: {
    currency: function () {
      return currencies[this.group.mincomeCurrency]
    }
  },
  filters: {
    toPercent
  }
}
</script>

<style lang="scss" scoped>
  .is-ancestor {
    flex-wrap: wrap;
  }
</style>
