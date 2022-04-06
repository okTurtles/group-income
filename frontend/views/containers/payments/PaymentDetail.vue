<template lang='pug'>
modal-template(ref='modal' v-if='payment' :a11yTitle='L("Payment details")')
  template(slot='title')
    i18n Payment details

  .is-title-2.c-title(data-test='amount') {{ withCurrency(payment.data.amount) }}
  .c-subtitle.has-text-1(data-test='subtitle') {{ subtitleCopy }}

  //- TODO This should be a table...
  ul.c-payment-list(data-test='details')
    li.c-payment-list-item
      i18n.has-text-1(tag='label') Date & Time
      strong {{ humanDate(payment.meta.createdDate, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
    li.c-payment-list-item
      i18n.has-text-1 Relative to
      strong {{ humanDate(dateFromMonthstamp(payment.monthstamp), { month: 'long', year: 'numeric' }) }}
    li.c-payment-list-item
      i18n.has-text-1 Mincome at the time
      strong {{ withCurrency(payment.data.groupMincome) }}
    li.c-payment-list-item.c-column(v-if='payment.data.memo')
      i18n.has-text-1 Notes
      p.has-text-bold {{ payment.data.memo }}

  .buttons
    i18n.button.is-danger.is-outlined.is-small(
      tag='button'
      @click='submit'
    ) Cancel payment
</template>

<script>
import { mapGetters } from 'vuex'
import L from '@view-utils/translations.js'
import sbp from '~/shared/sbp.js'
import { CLOSE_MODAL, SET_MODAL_QUERIES } from '@utils/events.js'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import currencies from '@view-utils/currencies.js'
import { dateToMonthstamp, dateFromMonthstamp, humanDate } from '@utils/time.js'

export default ({
  name: 'PaymentDetail',
  components: {
    ModalTemplate
  },
  created () {
    const id = this.$route.query.id
    const payment = this.currentGroupState.payments[id]

    if (id) {
      sbp('okTurtles.events/emit', SET_MODAL_QUERIES, 'PaymentDetail', { id })
    }
    if (payment) {
      this.payment = payment
      // TODO: the payment augmentation duplication in Payment and PaymentRecord, and between todo/sent/received, needs to be resolved more thoroughly
      this.payment.monthstamp = dateToMonthstamp(this.payment.meta.createdDate)
    } else {
      console.warn('PaymentDetail: Missing valid query "id"')
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    }
  },
  data: () => ({
    payment: null
  }),
  computed: {
    ...mapGetters([
      'currentGroupState',
      'ourUsername',
      'userDisplayName'
    ]),
    withCurrency () {
      return currencies[this.payment.data.currencyFromTo[0]].displayWithCurrency
    },
    subtitleCopy () {
      const toUser = this.payment.data.toUser
      const fromUser = this.payment.meta.username
      const arg = (username) => ({ name: this.userDisplayName(username) })
      return toUser === this.ourUsername ? L('Sent by {name}', arg(fromUser)) : L('Sent to {name}', arg(toUser))
    }
  },
  methods: {
    closeModal () {
      this.$refs.modal.close()
    },
    submit () {
      alert('TODO: Implement cancel payment')
    },
    dateFromMonthstamp,
    humanDate
  },
  validations: {
    form: {}
  }
}: Object)
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
      padding-bottom: 0.3125rem;
    }
  }
}

.buttons {
  justify-content: center;
}
</style>
