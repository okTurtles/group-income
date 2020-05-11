<template lang='pug'>
// Stop initialization if paymentDistribution not present
modal-base-template(ref='modal' :fullscreen='true' class='has-background' v-if='paymentsList' :a11yTitle='L("Record payments")')
  .c-header(:class='{"hide-desktop": donePayment}')
    i18n.is-title-2.c-title(tag='h2') Record payments

  .c-payment-form(v-if='!donePayment')
    .c-content
      form.card.c-card(
        @submit.prevent=''
        novalidate='true'
      )
        i18n.has-text-bold.c-title(tag='h3') Who did you send money to?
        record-payments-list(
          :paymentsList='ephemeral.payments'
        )

        .c-footer
          .c-footer-info
            i18n.has-text-bold(
              tag='h4'
              :args='{ span_: `<span class="has-text-small has-text-1 has-text-normal">`, _span: "</span>"}'
            ) Add a note {span_}(optional){_span}

            i18n.has-text-small.has-text-1(
              tag='p'
            ) Leave a message to the group members selected above.
          .c-footer-action
            input.switch#showComment(
              type='checkbox'
              name='displayComment'
              @change='displayComment = !displayComment'
            )
            i18n.sr-only(tag='label' for='displayComment') Toggle comment box

        transition(name='slidedown')
          label.field(v-if='displayComment')
            i18n.sr-only.label Leave a message
            textarea.textarea.c-comment(
              rows='4'
            )

        .buttons.c-buttons
          i18n.is-outlined(
            tag='button'
            @click='closeModal'
          ) Cancel

          button.is-success(
            @click='submit'
            :disabled='this.recordNumber === 0'
          ) {{ registerPaymentCopy }}

  .c-payment-success(v-else)
    svg-success
    i18n.is-title-2.c-title(tag='h2') Your payments were recorded
    banner-simple(severity='info')
      i18n(
        :args='{ r1: `<a class="link" href="https://donorbox.org/okturtles-donation" target="_blank">`, r2: "</a>"}'
      ) Please support the development of Group Income by {r1}sending a donation{r2}!

    i18n.is-outlined(
      tag='button'
      @click='closeModal'
    ) Close
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapState, mapGetters } from 'vuex'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import RecordPaymentsList from '@containers/payments/RecordPaymentsList.vue'
import L from '@view-utils/translations.js'
import { validationMixin } from 'vuelidate'
import { CLOSE_MODAL } from '@utils/events.js'
import SvgSuccess from '@svgs/success.svg'
import BannerSimple from '@components/banners/BannerSimple.vue'
import { PAYMENT_PENDING, PAYMENT_COMPLETED, PAYMENT_TYPE_MANUAL } from '@model/contracts/payments/index.js'

export default {
  name: 'RecordPayment',
  mixins: [validationMixin],
  props: {
    paymentsList: {
      type: Array
    }
  },
  data () {
    return {
      displayComment: false,
      form: {},
      donePayment: false,
      ephemeral: {
        payments: this.paymentsList
      }
    }
  },
  created () {
    if (!this.paymentsList) {
      console.warn('Missing paymentsList to display RecordPayment modal')
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    }
  },
  components: {
    ModalBaseTemplate,
    RecordPaymentsList,
    SvgSuccess,
    BannerSimple
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupSettings',
      'groupMincomeCurrency',
      'thisMonthsPaymentInfo'
    ]),
    recordNumber () {
      return this.paymentsList.filter(payment => payment.checked).length
    },
    registerPaymentCopy () {
      return this.recordNumber === 1
        ? L('Record 1 payment')
        : L('Record {number} payments', { number: this.recordNumber })
    }
  },
  methods: {
    closeModal () {
      this.$refs.modal.close()
    },
    async submit () {
      // TODO: remember when creating 'gi.contracts/group/payment' to set the payment
      //       currency using:
      //       getters.thisMonthsPaymentInfo.firstMonthsCurrency || getters.groupMincomeCurrency
      for (const payment of this.ephemeral.payments) {
        if (payment.checked) {
          // TODO: handle errors!
          try {
            // TODO: do currency conversion here using firstMonthsCurrency ?
            const groupCurrency = this.groupMincomeCurrency
            const paymentInfo = {
              toUser: payment.username,
              amount: +payment.amount, // TODO/BUG do not modify payment.amout directly on RecordPaymentRow...
              total: payment.amount, // ...we need to know it here, to know if it's a partial payment or not.
              currencyFromTo: ['USD', groupCurrency], // TODO: this!
              groupMincome: this.groupSettings.mincomeAmount,
              exchangeRate: 1,
              txid: '' + Math.random(),
              status: PAYMENT_PENDING,
              paymentType: PAYMENT_TYPE_MANUAL,
              month: payment.monthstamp
              // TOOD: add memo if user added a note
            }
            const msg = await sbp('gi.actions/group/payment', paymentInfo, this.currentGroupId)
            // TODO: hack until /payment supports sending completed payment
            //       (and "uncompleting" a payment)
            await sbp('gi.actions/group/paymentUpdate', {
              paymentHash: msg.hash(),
              updatedProperties: {
                status: PAYMENT_COMPLETED
              }
            }, this.currentGroupId)
          } catch (e) {
            console.error('TODO: this!', e)
          }
        }
      }
      this.donePayment = true
    }
  },
  validations: {
    form: {}
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-header {
  background: $white;
  padding: 1.5rem 0 1.125rem 2rem;
  position: absolute;
  left: 0;
  right: 0;

  @include tablet {
    text-align: center;
    padding: 2rem 0 1.625rem 0;
  }

  @include desktop {
    max-width: 33rem;
    width: 100%;
    background: transparent;
    text-align: left;
    position: relative;
    padding-top: 2.5rem;
    padding-bottom: 1rem;
  }
}

.c-payment-form {
  width: 100%;
  @include tablet {
    max-width: 33rem;
  }
}

.c-content {
  padding-top: 6.125rem;

  @include tablet {
    padding-top: 7.25rem;
  }

  @include desktop {
    padding-top: 0;
  }

  .c-title {
    margin-bottom: 0.5rem;
    font-size: $size_4;

    @include tablet {
      margin-bottom: 1rem;
    }
  }
}

// Footer
.c-footer {
  padding-top: 1.5rem;
  display: flex;
  justify-content: space-between;

  @include tablet {
    padding-top: 1.5rem;
  }

  @include desktop {
    padding-top: 1.5rem;
  }
}

// Actions
.c-comment {
  margin-top: 1rem;
}

.c-buttons {
  @include phone {
    flex-direction: column-reverse;

    button:first-child {
      margin-top: 1rem;
      margin-right: 0;
    }

    button {
      width: 100%;
    }
  }
}

// Sucess
.c-payment-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 9rem;

  @include tablet {
    padding-top: 10rem;
  }

  @include desktop {
    padding-top: 8rem;
  }

  .c-title {
    margin: 2rem;
  }

  .c-message {
    max-width: 24.5rem;
  }

  button {
    margin-top: 2rem;
  }
}
</style>
