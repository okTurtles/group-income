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
          :paymentsList='form.paymentsToRecord'
          @update='updateRecord'
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
              @change='ephemeral.displayMemo = !ephemeral.displayMemo'
            )
            i18n.sr-only(tag='label' for='displayMemo') Toggle comment box

        transition(name='slidedown')
          label.field(v-if='ephemeral.displayMemo')
            i18n.sr-only.label Leave a message
            textarea.textarea.c-comment(v-model='form.memo' rows='4')

        banner-scoped(ref='formMsg' data-test='formMsg')

        .buttons.c-buttons
          i18n.is-outlined(
            tag='button'
            type='button'
            @click='closeModal'
          ) Cancel

          button-submit.is-success(
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
      data-test='successClose'
      @click='closeModal'
    ) Close
</template>

<script>
import Vue from 'vue'
import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import { PAYMENT_PENDING, PAYMENT_COMPLETED, PAYMENT_NOT_RECEIVED, PAYMENT_TYPE_MANUAL } from '@model/contracts/payments/index.js'
import L from '@view-utils/translations.js'
import { validationMixin } from 'vuelidate'
import SvgSuccess from '@svgs/success.svg'
import { dateToMonthstamp } from '@utils/time.js'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import RecordPaymentsList from '@containers/payments/RecordPaymentsList.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import BannerSimple from '@components/banners/BannerSimple.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'

export default ({
  name: 'RecordPayment',
  mixins: [validationMixin],
  components: {
    ModalBaseTemplate,
    RecordPaymentsList,
    SvgSuccess,
    BannerScoped,
    BannerSimple,
    ButtonSubmit
  },
  data () {
    return {
      form: {
        paymentsToRecord: [],
        memo: ''
      },
      ephemeral: {
        displayMemo: false
      },
      donePayment: false
    }
  },
  created () {
    this.form.paymentsToRecord = this.paymentsList.map((payment, index) => ({
      ...payment,
      index: index, // A link between original payment and this copy
      checked: false
    }))
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupSettings',
      'groupMincomeCurrency',
      'thisPeriodPaymentInfo',
      'ourPayments',
      'userDisplayName'
    ]),
    paymentsList () {
      const latePayments = []
      const notReceivedPayments = []
      const todoPayments = []

      for (const payment of this.ourPayments.sent) {
        const { hash, data, meta } = payment
        if (data.status !== PAYMENT_NOT_RECEIVED) {
          continue
        }
        notReceivedPayments.push({
          hash,
          data,
          meta,
          username: data.toUser,
          displayName: this.userDisplayName(data.toUser),
          date: meta.createdDate,
          monthstamp: dateToMonthstamp(meta.createdDate),
          amount: data.amount
        })
      }

      for (const payment of this.ourPayments.todo) {
        todoPayments.push({
          hash: payment.hash,
          username: payment.to,
          displayName: this.userDisplayName(payment.to),
          amount: payment.amount,
          total: payment.total,
          partial: payment.partial,
          isLate: payment.isLate,
          date: payment.dueOn
        })
      }

      return latePayments.concat(notReceivedPayments, todoPayments)
    },
    recordNumber () {
      return this.form.paymentsToRecord.filter(p => p.checked).length
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
    updateRecord ({ index, ...data }) {
      Vue.set(this.form.paymentsToRecord, index, {
        ...this.form.paymentsToRecord[index],
        ...data
      })
    },
    async submit () {
      const groupCurrency = this.groupMincomeCurrency
      const paymentsToRecord = this.form.paymentsToRecord.filter(p => p.checked)
      let hasError = false
      this.$refs.formMsg.clean()

      for (const pRecord of paymentsToRecord) {
        const payment = this.paymentsList[pRecord.index]

        if (pRecord.amount > payment.amount) {
          // TODO/REVIEW - Should we show a warning?
        }

        try {
          // TODO: do currency conversion here using initialCurrency?
          // TODO: remember when creating 'gi.contracts/group/payment' to set the payment
          //       currency using:
          //       getters.thisPeriodPaymentInfo.initialCurrency || getters.groupMincomeCurrency
          const memo = this.form.memo
          const paymentInfo = {
            toUser: payment.username,
            amount: +pRecord.amount,
            total: payment.amount,
            isLate: payment.isLate,
            // Even if amount is the same, it can be a partial from a previous partial payment
            // TODO: Maybe this can fix the Payments.vue bug when looking for other partials' hash.
            partial: payment.partial || pRecord.amount - payment.amount > 0,
            monthstamp: payment.monthstamp,
            currencyFromTo: ['USD', groupCurrency], // TODO: this!
            exchangeRate: 1,
            txid: '' + Math.random(),
            status: PAYMENT_PENDING,
            paymentType: PAYMENT_TYPE_MANUAL,
            ...(memo ? { memo } : {}) // TODO/BUG with flowTyper validation. Empty string '' fails.
          }
          const msg = await sbp('gi.actions/group/payment', {
            contractID: this.currentGroupId, data: paymentInfo
          })
          // TODO: hack until /payment supports sending completed payment
          //       (and "uncompleting" a payment)
          await sbp('gi.actions/group/paymentUpdate', {
            contractID: this.currentGroupId,
            data: {
              paymentHash: msg.hash(),
              updatedProperties: {
                status: PAYMENT_COMPLETED
              }
            }
          })
        } catch (e) {
          hasError = true
          console.error('RecordPayment submit() error:', e)
          this.$refs.formMsg.danger(e)
        }
      }

      if (!hasError) {
        this.donePayment = true
      }
    }
  }
}: Object)
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
