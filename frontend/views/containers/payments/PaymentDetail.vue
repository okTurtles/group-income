<template lang='pug'>
// Stop initialization if payment not present
modal-template(ref='modal' v-if='payment')
  template(slot='title')
    i18n Payment details

  .is-title-2.c-title {{ currency(payment.amount) }}
  .c-subtitle.has-text-1 {{ subtitleCopy }}

  ul.c-payment-list
    li.c-payment-list-item
      i18n.has-text-1(tag='label') Date & Time
      strong {{ moment(payment.date).format('hh:mm - MMMM DD, YYYY') }}
    li.c-payment-list-item
      i18n.has-text-1(tag='label') Relative to
      strong {{ moment(payment.relativeTo).format('MMMM')}}
    li.c-payment-list-item
      i18n.has-text-1(tag='label') Mincome at the time
      strong {{ currency(groupSettings.mincomeAmount) }}
    li.c-payment-list-item.c-column
      i18n.has-text-1(tag='label') Notes
      p {{ payment.note }}

  .buttons
    i18n.button.is-danger.is-outlined.is-small(
      tag='button'
      @click='submit'
    ) Cancel payment
</template>

<script>
import { mapGetters } from 'vuex'
import L from '@view-utils/translations.js'
import moment from 'moment'
import sbp from '~/shared/sbp.js'
import { CLOSE_MODAL } from '@utils/events.js'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import currencies from '@view-utils/currencies.js'

export default {
  name: 'PaymentDetail',
  props: {
    payment: {
      type: Object
    },
    needsIncome: {
      type: Boolean
    }
  },
  components: {
    ModalTemplate
  },
  created () {
    if (!this.payment) {
      console.warn('Missing payment or needsIncome to display PaymentDetail modal')
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    }
  },
  computed: {
    ...mapGetters([
      'groupSettings'
    ]),
    currency () {
      return currencies[this.groupSettings.mincomeCurrency].displayWithCurrency
    },
    subtitleCopy () {
      const args = { name: this.payment.displayName }
      return this.needsIncome ? L('Sent by {name}', args) : L('Sent to {name}', args)
    }
  },
  methods: {
    closeModal () {
      this.$refs.modal.close()
    },
    async submit () {
      console.log('Todo: Implement cancel payment')
      this.closeModal()
    },
    moment
  },
  validations: {
    form: {}
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-payment-list {
  margin: 1rem auto 0.5rem auto;
  width: 100%;
  max-width: 25rem;
}

.c-subtitle,
.c-title {
  text-align: center;
  width: 100%;
}

.c-subtitle {
  margin-top: 0.25rem;

  @include tablet {
    margin-bottom: 0.25rem;
  }
}

.c-payment-list-item {
  height: 3.3125rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid $general_0;

  &.c-column {
    flex-direction: column;
    height: auto;
    align-items: flex-start;

    .has-text-1 {
      padding-top: 1rem;
      padding-bottom: 0.3125rem
    }
  }
}

.buttons {
  justify-content: center;
}
</style>
