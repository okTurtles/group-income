<template lang="pug">
  callout-card(
    :isCard='true'
    :title='L("Welcome, {username}!", { username: ourUserDisplayName })'
    :svg='SvgHello'
  )
    i18n(tag='p') Add your income details to start receiving or giving mincome.
    i18n(
      tag='button'
      data-test='openIncomeDetailsModal'
      @click='openModal("IncomeDetails")'
    ) Add income details
</template>

<script>
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'
import { mapGetters } from 'vuex'
import CalloutCard from '@components/CalloutCard.vue'
import SvgHello from '@svgs/hello.svg'

export default {
  name: 'AddIncomeDetailsWidget',
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
      'ourUserDisplayName'
    ])
  },
  methods: {
    openModal (name) {
      sbp('okTurtles.events/emit', OPEN_MODAL, name)
    }
  }
}
</script>
