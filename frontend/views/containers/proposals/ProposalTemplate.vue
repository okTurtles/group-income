<template lang='pug'>
  modal-template(class='has-background is-centered')
    template(slot='subtitle')
      i18n New proposal
    template(slot='title')
      i18n(v-if='isConfirmation') Your proposal was created
      i18n(v-else) Change minimum income

    form
      transition(name='fade' mode='out-in')
        div(v-if='currentStep === 0' key='0')
          label.label New minimum income
          .select-wrapper
            input.input(
              ref='mincome'
              type='number'
              placeholder='Amount'
              name='incomeProvided'
              step='1'
              min='0'
              required=''
              :class="{ 'error': $v.form.incomeProvided.$error }"
              v-model='form.incomeProvided'
              @keyup.enter='next'
            )

            select(
              name='incomeCurrency'
              required=''
              v-model='form.incomeCurrency'
            )
              option(
                v-for='(symbol, code) in currencies'
                :value='code'
                :key='code'
              ) {{ symbol }}

          p Currently $1000 monthly.

        div(v-if='currentStep === 1' key='1')
          .field
            label.label
              i18n Why are you proposing this change?

            textarea.textarea(
              name='changeReason'
              ref='purpose'
              placeholder='The reason why I\' propositiong this change is...'
              maxlength='500'
              :class="{ 'error': $v.form.changeReason.$error }"
              v-model='form.changeReason'
            )

            p.error(
              v-show='$v.form.changeReason.$error'
            )
              i18n username cannot contain spaces

        div.confirmation(v-if='isConfirmation' key='3')
          img(src='/assets/images/group-vote.png' alt='Group vote')
          p
            | Members of your group will now be asked to vote.
            | You need 8 yes votes for your proposal to be accepted.

      .buttons(:class='{ "is-centered": isConfirmation }')
        button.is-outlined(
          v-if='!isConfirmation'
          @click.prevent='prev'
          data-test='prevBtn'
        )
          i18n {{ currentStep === 0 ? 'Cancel' : 'Back' }}

        button.is-success(
          v-if='this.currentStep  < config.steps.length - 1'
          ref='next'
          @click.prevent='next'
          :disabled='$v.steps[config.steps[currentStep]] && $v.steps[config.steps[currentStep]].$invalid'
          data-test='nextBtn'
        )
          i18n Next
          i.icon-arrow-right

        button.is-success(
          v-if='isLastStep'
          ref='finish'
          @click.prevent='submit'
          :disabled='$v.form.$invalid'
          data-test='finishBtn'
        )
          i18n Create Proposal

        button.is-outlined(
            v-if='isConfirmation'
            ref='close'
            @click.prevent='close'
            :disabled='$v.form.$invalid'
            data-test='closeBtn'
          )
            i18n Awesome

    template(#footer='' v-if='!isConfirmation')
      p According to your voting rules, 8 out of 10 members will have to agree with this.
</template>

<script>
import { validationMixin } from 'vuelidate'
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import { CLOSE_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'
import L from '@view-utils/translations.js'
import { decimals } from '@view-utils/validators.js'
import { required } from 'vuelidate/lib/validators'
import currencies from '@view-utils/currencies'

export default {
  name: 'ModalForm',
  components: {
    ModalTemplate
  },
  mixins: [
    validationMixin
  ],
  props: {
    subTitle: String,
    submitError: String,
    onSubmit: Function
  },
  data () {
    return {
      currencies,
      currentStep: 0,
      v: { type: Object },
      form: {
        incomeProvided: null,
        incomeCurrency: 'USD', // TODO: grab this as a constant from currencies.js,
        changeReason: null
      },
      ephemeral: {
        errorMsg: null,
        // this determines whether or not to render proxy components for nightmare
        dev: process.env.NODE_ENV === 'development'
      },
      config: {
        steps: [
          'GroupMincome',
          'ChangeReason'
        ]
      }
    }
  },
  methods: {
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    },
    next () {
      this.currentStep = this.currentStep + 1
    },
    prev () {
      if (this.currentStep > 0) {
        this.currentStep = this.currentStep - 1
      } else {
        this.close()
      }
    },
    focusRef (ref) {
      this.$refs[ref].focus()
    },
    submit: async function () {
      if (this.$v.form.$invalid) {
        // TODO: more descriptive error message, highlight erroneous step
        this.ephemeral.errorMsg = L('We still need some info from you, please go back and fill missing fields')
        return
      }

      try {
        this.ephemeral.errorMsg = null
        // TODO create action for group income proposal
        // const entry = sbp('gi/contract/create-action', 'GroupProposal', {
        //   incomeProvided: this.form.incomeProvided,
        //   incomeCurrency: this.form.incomeCurrency
        // })

        // await sbp('backend/publishLogEntry', entry)
        this.next()
      } catch (error) {
        console.error(error)
        this.ephemeral.errorMsg = L('Failed to create the proposal')
      }
    }
  },
  computed: {
    isLastStep () {
      return this.currentStep === this.config.steps.length - 1
    },
    isConfirmation () {
      return this.currentStep === this.config.steps.length
    }
  },
  validations: {
    form: {
      incomeProvided: {
        required,
        decimals: decimals(2)
      },
      incomeCurrency: {
        required
      },
      changeReason: {}
    },
    // validation groups by route name for steps
    steps: {
      GroupMincome: [
        'form.incomeProvided',
        'form.incomeCurrency'
      ],
      Reason: [
        'form.changeReason'
      ]
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.confirmation {
  display: flex;
  flex-direction: column;
  text-align: center;

  img {
    margin: 0 auto 2rem;
  }
}
</style>
