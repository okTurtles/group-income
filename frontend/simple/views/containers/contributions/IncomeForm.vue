<template>
  <modal ref="modal" :isActive="true" @close="cancelForm">
    <form class="modal-card-content c-wrapper" @submit.prevent="verifyForm" novalidate="true">
      <i18n tag="h2" class="title is-3">Income Details</i18n>
      <div class="columns is-mobile c-wrapper-columns">
        <div class="column c-form">
          <fieldset class="fieldset">
            <i18n tag="legend" class="sr-only">Income details</i18n>

            <div class="field is-narrow gi-fieldGroup">
              <i18n tag="p" class="label">Do you make at least {{fakeStore.mincomeFormatted}} per month?</i18n>
              <i18n tag="span" class="help has-text-danger gi-help" v-if="$v.form.option.$error">{{infoRequired}}</i18n>
              <div class="control">
                <label class="gi-tick">
                  <input class="gi-tick-input" type="radio" value="no" v-model="form.option" @change="resetFormVerify">
                  <span class="gi-tick-custom"></span>
                  <i18n>No, I don't</i18n>
                </label>
                <label class="gi-tick">
                  <input class="gi-tick-input" type="radio" value="yes" v-model="form.option" @change="resetFormVerify">
                  <span class="gi-tick-custom"></span>
                  <i18n>Yes, I do</i18n>
                </label>
              </div>
            </div>

            <input-amount v-if="needsIncome" key="income"
              label="What's your monthly income?"
              :error="inputIncomeError"
              @input="verifyInputIncome"
              :value="form.income"
              :placeholder="L('amout')"
            >
              <template slot="help">
                <text-who :who="['Rick', 'Carl', 'Kim']"></text-who>
                <i18n>will ensure you meet the mincome</i18n>
              </template>
            </input-amount>

            <input-amount v-else-if="canPledge" key="pledge"
              label="How much do you want to pledge?"
              :error="inputPledgeError"
              @input="verifyInputPledge"
              :value="form.pledge"
              :placeholder="L('amout')"
            >
              <template slot="help">
                <i18n tag="p">Define up to how much you pledge to contribute to the group each month.</i18n>
                <i18n tag="p" class="c-help-extra">You can pledge any amount (even $1 million!) Only the minimum needed amount will be given.</i18n>
              </template>
            </input-amount>
          </fieldset>
          <fieldset class="fieldset" v-if="!!$v.form.option.$model">
            <payment-methods />
          </fieldset>
        </div>

        <group-pledges-graph class="column c-pledgesGraph"
          :userPledgeAmount="userPledgeAmount"
          :userIncomeAmount="userIncomeAmount"
        />
      </div>

      <div class="field is-grouped">
        <p class="control">
          <i18n tag="button" class="button is-primary" type="submit">{{saveButtonText}}</i18n>
        </p>
        <p class="control">
          <i18n tag="button" class="button" type="button" @click="cancelForm">Cancel</i18n>
        </p>
      </div>
      </form>
  </modal>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-wrapper {
  width: 50rem;
  max-width: 100%;
  height: 100%;
  overflow: auto;

  @include mobile {
    height: 100vh;
  }

  &-columns {
    @include mobile {
      flex-direction: column;
    }
  }
}

.c-help-extra {
  margin-top: $gi-spacer-sm;
}

.c-form,
.c-pledgesGraph {
  flex-basis: 50%;
}

.c-pledgesGraph {
  align-items: flex-start;
  flex-grow: 1;

  @include mobile {
    order: -1; // display on the top for better understanding on small screens
    padding: $gi-spacer $gi-spacer-sm;
  }

  @include tablet {
    justify-content: center;
    margin-top: -$gi-spacer-lg;
  }
}

</style>
<script>
import { validationMixin } from 'vuelidate'
import { requiredIf, required } from 'vuelidate/lib/validators'
import InputAmount from './InputAmount.vue'
import PaymentMethods from './PaymentMethods.vue'
import Modal from '../../components/Modal/ModalBasic.vue'
import TextWho from '../../components/TextWho.vue'
import GroupPledgesGraph from '../GroupPledgesGraph.vue'
const fakeStoreMincome = 500

const hasLowIncome = (value) => value < fakeStoreMincome - 1

export default {
  name: 'IncomeForm',
  mixins: [ validationMixin ],
  components: {
    Modal,
    InputAmount,
    TextWho,
    PaymentMethods,
    GroupPledgesGraph
  },
  props: {
    isEditing: Boolean
  },
  data () {
    return {
      ephemeral: {
        /* formVerified: false */
      },
      form: {
        option: null,
        income: null,
        pledge: null
      },
      // -- Hardcoded Data just for layout purposes:
      fakeStore: {
        mincome: fakeStoreMincome,
        mincomeFormatted: '$500'
      }
    }
  },
  computed: {
    infoRequired () {
      return this.L('This information is required.')
    },
    needsIncome () {
      return this.$v.form.option.$model === 'no'
    },
    canPledge () {
      return this.$v.form.option.$model === 'yes'
    },
    inputIncomeError () {
      if (!this.$v.form.income.hasLowIncome) {
        return this.L('If your income is the same or higher than the group\'s mincome change your answer to "Yes, I do"')
      } else if (this.$v.form.income.$error) {
        return this.infoRequired
      }
    },
    inputPledgeError () {
      return this.$v.form.pledge.$error ? this.infoRequired : null
    },
    userPledgeAmount () {
      return this.canPledge & !!this.form.pledge ? Number(this.form.pledge) : null
    },
    userIncomeAmount () {
      return this.needsIncome & !!this.form.income ? Number(this.form.income) : null
    },
    saveButtonText () {
      const verb = this.isFirstTime ? 'Add' : 'Save'

      if (!this.$v.form.option.$model) { return this.L('{verb} details', { verb }) }
      if (this.canPledge) { return this.L('{verb} pledged details', { verb }) }
      if (this.needsIncome) { return this.L('{verb} income details', { verb }) }
    }
  },
  methods: {
    verifyInputIncome (e) {
      this.form.income = e.target.value
      this.$v.form.income.$touch()
    },
    verifyInputPledge (e) {
      this.form.pledge = e.target.value
      this.$v.form.pledge.$touch()
    },
    verifyForm () {
      this.$v.form.$touch()

      if (!this.$v.form.$invalid) {
        const makeIncome = this.canPledge

        this.$emit('save', {
          makeIncome,
          amount: makeIncome ? this.$v.form.pledge.$model : this.$v.form.income.$model
        })
      }
    },
    cancelForm () {
      this.$emit('cancel')
    },
    resetFormVerify () {
      this.$v.form.$reset()
    }
  },
  validations: {
    form: {
      option: {
        required
      },
      income: {
        required: requiredIf(function (model) {
          return this.needsIncome
        }),
        hasLowIncome
      },
      pledge: {
        required: requiredIf(function (model) {
          return this.canPledge
        })
      }
    }
  }
}
</script>
