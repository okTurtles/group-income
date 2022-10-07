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
      strong {{ humanDate(payment.periodstamp, { month: 'long', year: 'numeric', day: 'numeric' }) }}
    li.c-payment-list-item
      i18n.has-text-1 Mincome at the time
      strong {{ withCurrency(payment.data.groupMincome) }}
    li.c-payment-list-item(v-if='lightningPayment')
      i18n.has-text-1 Transaction ID
      link-to-copy.c-lightning-trxn-id(
        :link='payment.data.transactionId'
      )

    li.c-payment-list-item.c-column(v-if='payment.data.memo')
      i18n.has-text-1 Notes
      p.has-text-bold {{ payment.data.memo }}

  .buttons.c-buttons-container(v-if='!lightningPayment')
    i18n.button.is-outlined(
      tag='button'
      @click='cancelPayment'
    ) Cancel payment

    i18n.button(
      tag='button'
      @click='sendThankYou'
    ) Send Thanks!
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { L } from '@common/common.js'
import { CLOSE_MODAL, REPLACE_MODAL, SET_MODAL_QUERIES } from '@utils/events.js'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import LinkToCopy from '@components/LinkToCopy.vue'
import currencies from '@model/contracts/shared/currencies.js'
import { humanDate } from '@model/contracts/shared/time.js'
import { cloneDeep } from '@model/contracts/shared/giLodash.js'

export default ({
  name: 'PaymentDetail',
  components: {
    ModalTemplate,
    LinkToCopy
  },
  created () {
    const id = this.$route.query.id
    const payment = this.lightningPayment || // TODO: to be re-worked once lightning network is implemented.
      this.currentGroupState.payments[id]

    if (id) {
      sbp('okTurtles.events/emit', SET_MODAL_QUERIES, 'PaymentDetail', { id })
    }
    if (payment) {
      this.payment = cloneDeep(payment)
      // TODO: the payment augmentation duplication in Payment and PaymentRecord, and between todo/sent/received, needs to be resolved more thoroughly
      this.payment.periodstamp = this.periodStampGivenDate(this.payment.meta.createdDate)
    } else {
      console.warn('PaymentDetail: Missing valid query "id"')
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    }
  },
  data: () => ({
    payment: null
  }),
  props: {
    lightningPayment: {
      // temporary prop for dummy lightning payment data.
      // TODO: onece lightning networki is implemented, remove this prop and get the payment data from Vuex getter.
      type: Object,
      required: false
    }
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'ourUsername',
      'userDisplayName',
      'periodStampGivenDate'
    ]),
    withCurrency () {
      return currencies[this.payment.data.currencyFromTo[1]].displayWithCurrency
    },
    subtitleCopy () {
      const toUser = this.payment.data.toUser
      const fromUser = this.payment.meta.username
      const arg = (username) => ({ name: this.userDisplayName(username) })
      return toUser === this.ourUsername ? L('Sent by {name}', arg(fromUser)) : L('Sent to {name}', arg(toUser))
    }
  },
  methods: {
    humanDate,
    closeModal () {
      this.$refs.modal.close()
    },
    cancelPayment () {
      alert('TODO: Implement cancel payment')
    },
    sendThankYou () {
      sbp('okTurtles.events/emit', REPLACE_MODAL, 'SendThankYouModal', { to: this.payment.meta.username })
    }
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

  .c-lightning-trxn-id {
    max-width: 60%;
  }
}

.c-buttons-container {
  flex-direction: column-reverse;
  align-items: stretch;
  gap: 1rem;
  max-width: 25rem;
  margin: 1.625rem auto 0;
  width: 100%;

  .button:not(:last-child) {
    margin-right: 0;
  }

  @include tablet {
    flex-direction: row;
    justify-content: space-between;
    margin-top: 2rem;
    align-items: center;
  }

  @include desktop {
    max-width: unset;
  }
}
</style>
