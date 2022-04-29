<template lang="pug">
callout-card(
  data-test='addIncomeDetailsCard'
  :isCard='true'
  :title='title'
  :svg='image'
)
  p {{copy}}
  i18n(
    tag='button'
    data-test='openIncomeDetailsModal'
    @click='openModal("IncomeDetails")'
  ) Add income details
</template>

<script>
import sbp from '@sbp/sbp'
import { OPEN_MODAL } from '@utils/events.js'
import { mapGetters } from 'vuex'
import CalloutCard from '@components/CalloutCard.vue'
import SvgHello from '@svgs/hello.svg'
import SvgContributions from '@svgs/contributions.svg'
import L from '@view-utils/translations.js'

export default ({
  name: 'AddIncomeDetailsWidget',
  components: {
    CalloutCard
  },
  props: {
    hasWelcomeMessage: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      SvgHello
    }
  },
  computed: {
    ...mapGetters([
      'ourUserDisplayName'
    ]),

    title () {
      return this.hasWelcomeMessage ? L('Welcome, {username}!', { username: this.ourUserDisplayName }) : L('Add your income details')
    },

    copy () {
      return this.hasWelcomeMessage ? L('Add your income details to start receiving or giving mincome.') : L('This will allow you to start receiving or giving mincome.')
    },

    image () {
      return this.hasWelcomeMessage ? SvgHello : SvgContributions
    }
  },
  methods: {
    openModal (name) {
      sbp('okTurtles.events/emit', OPEN_MODAL, name)
    }
  }
}: Object)
</script>
