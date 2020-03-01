<template lang='pug'>
modal-base-template(ref='modal' :fullscreen='true' class='has-background')
  .c-payment-form(v-if='!donePayment')
    .c-header
      i18n.is-title-2.c-title(tag='h2') Record payments

    .c-content
      form.card.c-card(
        @submit.prevent='submit'
        novalidate='true'
      )
        i18n.has-text-bold.c-title(tag='h3') Who did you send money to?
        payments-list(
          :titles='tableTitles'
          :payments='fakeStore.paymentsDistribution'
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

          i18n.is-success(
            tag='button'
            @click='submit'
            :disabled='$v.form.$invalid'
            :args='{number: "0"}'
          ) Register {number} payment

  .c-payment-success(v-else)
    svg-success
    i18n.is-title-2.c-title(tag='h2') Your payments were recorded
    banner-simple(severity='info')
      i18n Please consider supporting the development of Group Income by sending a donation!

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
import SvgSuccess from '@svgs/success.svg'
import BannerSimple from '@components/banners/BannerSimple.vue'

export default {
  name: 'RecordPayment',
  mixins: [validationMixin],
  data () {
    return {
      displayComment: false,
      form: {},
      donePayment: false,
      // Temp until modal params are merged
      fakeStore: {
        paymentsDistribution: [{
          to: 'pierre',
          amount: 910.99,
          checked: false,
          date: new Date(+(new Date()) - Math.floor(Math.random() * 10000000000))
        }, {
          to: 'sandrina',
          amount: 1089.01,
          checked: true,
          date: new Date(+(new Date()) - Math.floor(Math.random() * 10000000000))
        }]
      }
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
    flex-direction: column;

    button + button {
      margin-top: $spacer;
    }
  }

}

// Sucess
.c-payment-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;

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
