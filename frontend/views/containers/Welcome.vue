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

  div
    i18n(tag='p') Add your income details to start receiving or giving mincome.

    i18n(
      tag='button'
      data-test='openIncomeDetailModal'
      @click='openModal("IncomeDetails")'
    ) Add income details
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
      'ourUsername'
    ]),
    userDisplayName () {
      const userContract = this.$store.getters.ourUserIdentityContract
      return userContract && userContract.attributes && userContract.attributes.displayName
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
