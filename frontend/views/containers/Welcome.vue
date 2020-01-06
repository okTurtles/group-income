<template lang="pug">
callout-card(
  :isCard='true'
  :svg='SvgHello'
)
  i18n.is-title-3.c-title(
    tag='h3'
    data-test='headerNeed'
    :args='{ userName: userDisplayName ? userDisplayName : ourUsername }'
  ) Welcome {userName}

  div(v-if='!memberGroupProfile.incomeDetailsType')
    i18n(tag='p') Add your income details to start receiving or giving mincome.

    i18n(
      tag='button'
      data-test='openIncomeDetailModal'
      @click='openModal("IncomeDetails")'
    ) Add income details
  div(v-else)
    i18n(tag='p' v-if='memberGroupProfile.incomeDetailsType === "pledgeAmount"') At the moment, no one in your group need your financial help.
    i18n(tag='p' v-else) At the moment, no one is able pledging any money to your group.
    i18n(tag='p') Maybe someone is missing from the group?
    i18n(tag='button' @click='openModal("InviteByLink")') Add members
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import CalloutCard from '@components/CalloutCard.vue'
import SvgHello from '@svgs/hello.svg'

export default {
  name: 'StartInviting',
  components: {
    CalloutCard,
    SvgHello
  },
  data () {
    return {
      SvgHello
    }
  },
  computed: {
    ...mapGetters([
      'groupIncomeDistribution',
      'ourUsername',
      'groupProfile'
    ]),
    userDisplayName () {
      const userContract = this.$store.getters.ourUserIdentityContract
      return userContract && userContract.attributes && userContract.attributes.displayName
    },
    memberGroupProfile () {
      return this.groupProfile(this.ourUsername)
    }
  },
  methods: {
    openModal (mode) {
      sbp('okTurtles.events/emit', OPEN_MODAL, mode)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
::v-deep .svg-hello.c-svg {
  @include desktop {
    height: 8.25rem;
  }
}
</style>
