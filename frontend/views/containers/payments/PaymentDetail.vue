<template lang='pug'>
modal-template(ref='modal' v-if='payment' :a11yTitle='L("Payment details")')
  template(slot='title')
    i18n Payment details

  .is-title-2.c-title(data-test='amount') {{ withGroupCurrency(payment.data.amount) }}
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
      strong {{ withGroupCurrency(payment.data.groupMincome) }}
    li.c-payment-list-item(v-if='lightningPayment')
      i18n.has-text-1 Transaction ID
      link-to-copy.c-lightning-trxn-id(
        :link='payment.data.transactionId'
      )

    li.c-payment-list-item.c-column(v-if='payment.data.memo')
      i18n.has-text-1 Notes
      p.has-text-bold {{ payment.data.memo }}

  .buttons.c-buttons-container(
    v-if='!lightningPayment && buttonCount > 0'
    :class='{ "is-centered": buttonCount === 1 }'
  )
    i18n.button.is-outlined(
      tag='button'
      v-if='isPaidByMyself && !payment.isOldPayment'
      @click='cancelPayment'
    ) Cancel payment

    i18n.button(
      v-if='!isPaidByMyself'
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
import PaymentsMixin from '@containers/payments/PaymentsMixin.js'
import { withGroupCurrency } from '@view-utils/misc.js'
import { humanDate, comparePeriodStamps } from '@model/contracts/shared/time.js'
import { cloneDeep } from 'turtledash'

export default ({
  name: 'PaymentDetail',
  components: {
    ModalTemplate,
    LinkToCopy
  },
  mixins: [PaymentsMixin],
  created () {
    this.initializeDetails()
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
      'ourIdentityContractId',
      'userDisplayNameFromID'
    ]),
    fromMemberID () {
      return this.payment?.data.fromMemberID || ''
    },
    isPaidByMyself () {
      return this.fromMemberID === this.ourIdentityContractId
    },
    buttonCount () {
      return Number(!this.isPaidByMyself) + Number(this.isPaidByMyself && !this.payment.isOldPayment)
    },
    subtitleCopy () {
      const toMemberID = this.payment.data.toMemberID
      const arg = (memberID) => ({ name: this.userDisplayNameFromID(memberID) })
      return toMemberID === this.ourIdentityContractId ? L('Sent by {name}', arg(this.fromMemberID)) : L('Sent to {name}', arg(toMemberID))
    }
  },
  methods: {
    withGroupCurrency,
    humanDate,
    async initializeDetails () {
      // NOTE: Only for the historical payments, there is 'period'
      const { id, period } = this.$route.query
      const payment = this.lightningPayment || // TODO: to be re-worked once lightning network is implemented.
        this.currentGroupState.payments[id] ||
        (await this.getHistoricalPaymentDetailsByPeriod(period))[id]

      if (id) {
        sbp('okTurtles.events/emit', SET_MODAL_QUERIES, 'PaymentDetail', { id })
      }
      if (payment) {
        const periodstamp = await this.historicalPeriodStampGivenDate(payment.meta.createdDate)
        // TODO: the payment augmentation duplication in Payment and PaymentRecord, and between todo/sent/received, needs to be resolved more thoroughly
        this.payment = {
          ...cloneDeep(payment),
          isOldPayment: comparePeriodStamps(periodstamp, this.currentPaymentPeriod) < 0,
          periodstamp
        }
      } else {
        console.warn('PaymentDetail: Missing valid query "id"')
        sbp('okTurtles.events/emit', CLOSE_MODAL)
      }
    },
    closeModal () {
      this.$refs.modal.close()
    },
    cancelPayment () {
      alert('TODO: Implement cancel payment')
    },
    sendThankYou () {
      sbp('okTurtles.events/emit', REPLACE_MODAL, 'SendThankYouModal', { toMemberID: this.payment.data.fromMemberID })
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

  &.is-centered {
    justify-content: center;
  }

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
