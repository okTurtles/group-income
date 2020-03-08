<template lang='pug'>
modal-base-template(ref='modal' :fullscreen='true' class='has-background')
  .c-header(:class='{"hide-desktop": donePayment}')
    i18n.is-title-2.c-title(tag='h2') Record payments

  .c-payment-form(v-if='!donePayment')
    .c-content
      form.card.c-card(
        @submit.prevent=''
        novalidate='true'
      )
        i18n.has-text-bold.c-title(tag='h3') Who did you send money to?
        payments-list(
          :titles='tableTitles'
          :payments='paymentsDistribution'
          paymentsType='edit'
        )

        .c-footer
          .c-footer-info
            i18n.has-text-bold(
              tag='h4'
              :args='{ optional: `<span class="has-text-small has-text-1 has-text-normal">(${L("optional")})</span>`}'
            ) Add a note {optional}

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
            textarea.c-comment(
              rows='4'
            )

        .buttons
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
        compile
        :args='{ r1: `<a class="link" href="https://donorbox.org/okturtles-donation" target="_blank">`, r2: "</a>"}'
      ) Please consider supporting the development of Group Income by {r1}sending a donation{r2}!

    i18n.is-outlined(
      tag='button'
      @click='closeModal'
    ) Close
</template>

<script>
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import PaymentsList from '@containers/payments/PaymentsList.vue'
import L from '@view-utils/translations.js'
import { validationMixin } from 'vuelidate'
import sbp from '~/shared/sbp.js'
import { CLOSE_MODAL } from '@utils/events.js'
import SvgSuccess from '@svgs/success.svg'
import BannerSimple from '@components/banners/BannerSimple.vue'

export default {
  name: 'RecordPayment',
  mixins: [validationMixin],
  props: {
    paymentsDistribution: {
      type: Array,
      required: true
    }
  },
  data () {
    return {
      displayComment: false,
      form: {},
      donePayment: false
    }
  },
  created () {
    if (!this.paymentsDistribution) {
      console.warn('Missing paymentsDistribution to display RecordPayment modal')
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    }
  },
  components: {
    ModalBaseTemplate,
    PaymentsList,
    SvgSuccess,
    BannerSimple
  },
  computed: {
    tableTitles () {
      return {
        one: L('Sent to'),
        two: '',
        three: L('Amount sent')
      }
    },
    recordNumber () {
      return this.paymentsDistribution.filter(payment => payment.checked).length
    },
    registerPaymentCopy () {
      return this.recordNumber === 1 ? L('Record 1 payment') : L('Record {number} payments', { number: this.recordNumber })
    }
  },
  methods: {
    closeModal () {
      this.$refs.modal.close()
    },
    async submit () {
      this.donePayment = true
      console.log('Todo: Implement record payment')
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
    margin-bottom: $spacer*0.5;
    font-size: $size_4;

    @include tablet {
      margin-bottom: $spacer;
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
  margin-top: $spacer;
}

.buttons {
  @include phone {
    flex-direction: column-reverse;

    button:first-child {
      margin-top: $spacer;
      margin-right: 0;
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
