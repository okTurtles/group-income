<template lang="pug">
callout-card(
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
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'
import { mapGetters } from 'vuex'
import CalloutCard from '@components/CalloutCard.vue'
import SvgHello from '@svgs/hello.svg'
import SvgContributions from '@svgs/contributions.svg'
import L from '@view-utils/translations.js'

export default {
  name: 'AddIncomeDetailsWidget',
  components: {
    CalloutCard
  },
  props: {
    welcomeMessage: {
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
      return this.welcomeMessage ? L('Welcome, {username}!', { username: this.ourUserDisplayName }) : L('Add your income details')
    },

    copy () {
      return this.welcomeMessage ? L('Add your income details to start receiving or giving mincome.') : L('This will allow you to start receiving or giving mincome.')
    },

    image () {
      return this.welcomeMessage ? SvgHello : SvgContributions
    }
  },
  methods: {
    openModal (name) {
      sbp('okTurtles.events/emit', OPEN_MODAL, name)
    }
  }
}
</script>
