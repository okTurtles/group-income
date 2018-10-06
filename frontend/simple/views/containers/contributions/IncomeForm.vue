<template>
  <modal ref="modal" :isActive="true" @close="cancelForm">
    <form class="modal-card-content c-form" @submit.prevent="verifyForm" novalidate="true">
      <i18n tag="h2" class="title is-3">Income Details</i18n>
      <div class="columns is-desktop is-multiline c-grid">
        <div class="column">
          <fieldset class="fieldset">
            <i18n tag="legend" class="sr-only">Income details</i18n>

            <div class="field is-narrow gi-fieldGroup">
              <i18n tag="p" class="label">Do you make at least {{fakeStore.mincome}} per month?</i18n>
              <i18n tag="strong" class="help has-text-danger has-text-weight-normal gi-help" v-if="formVerified && $v.form.option.$invalid">{{infoRequired}}</i18n>
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

            <field-input v-if="hasLessIncome"
              label="What's your monthly income?"
              :error="hasLessIncomeError"
            >
              <!-- REVIEW: How do I pass a v-model to a input inside a children component?
              That is preventing me of using :is component here -->
              <input class="input"
                :class="{'is-danger': hasLessIncomeError }"
                type="number"
                v-model="form.income"
                :placeholder="L('amout')"
              >
              <template slot="help">
                <text-who :who="['Rick', 'Carl', 'Kim']"></text-who>
                <i18n>will ensure you meet the mincome</i18n>
              </template>
            </field-input>

            <field-input v-if="hasMinIncome"
              label="Pledge amount"
              :error="hasMinIncomeError"
            >
              <input class="input"
                :class="{'is-danger': hasMinIncomeError }"
                type="number"
                v-model="form.pledge"
                :placeholder="L('amout')"
                value="100"
              >
              <template slot="help">
                <i18n tag="p">Define up to how much you pledge to contribute to the group each month.</i18n>
                <i18n tag="p" class="c-help-extra">You can pledge any amount (even $1 million!) Only the minimum needed amount will be given.</i18n>
              </template>
            </field-input>
          </fieldset>

          <fieldset class="fieldset" v-if="!!$v.form.option.$model">
            <i18n tag="legend" class="label">Payment method</i18n>
            <payment-methods></payment-methods>
          </fieldset>
        </div>

        <!-- TODO - move to container/GroupPledgeStatus to reuse on Dashboard.
          - this IncomeForm is becoming massive! -->
        <div class="column is-flex c-graph">
          <pie-chart :slices="groupPledgingSlices" class="c-graphPieChart">
            <i18n tag="p" class="is-uppercase has-text-grey is-size-7">Group Pledge Goal</i18n>
            <span class="has-text-weight-bold">{{fakeStore.currency}}{{graphPledgeData.goal}}</span>
          </pie-chart>
          <graph-legend-group class="columns c-graphLegend" :aria-label="L('Group\'s Pledge Summary')">
            <graph-legend-item
              v-for="item in groupPledgingLegend"
              class="column is-half c-graphLegendItem"
              :label="item.label"
              :color="item.color"
            >
              {{item.value}}
            </graph-legend-item>
          </graph-legend-group>
        </div>
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

.c-form {
  width: 50rem;
  height: 100%;
  overflow: auto;
}

.c-help-extra {
  margin-top: $gi-spacer-sm;
}

.c-graph {
  flex-direction: column;
  align-items: center;
  padding-left: $gi-spacer-lg;

  &Legend {
    margin-top: $gi-spacer-sm;

    &Item {
      padding-bottom: 0;
    }
  }
}

// TODO - dont forget mobile/tablet layout

</style>
<script>
import { validationMixin } from 'vuelidate'
import { requiredIf, required, maxValue } from 'vuelidate/lib/validators'
import FieldInput from './FieldInput.vue'
import PaymentMethods from './PaymentMethods.vue'
import Modal from '../../components/Modal/ModalBasic.vue'
import TextWho from '../../components/TextWho.vue'
import { PieChart, GraphLegendGroup, GraphLegendItem } from '../../components/Graphs/index.js'
import currencies from '../../utils/currencies.js'

export default {
  name: 'IncomeForm',
  mixins: [ validationMixin ],
  components: {
    Modal,
    FieldInput,
    PaymentMethods,
    TextWho,
    PieChart,
    GraphLegendGroup,
    GraphLegendItem
  },
  props: {
    isEditing: Boolean,
    transEnter: Function,
    transAfterEnter: Function,
    transLeave: Function
  },
  data () {
    return {
      form: {
        option: null,
        income: null,
        pledge: null
      },
      formVerified: false,
      // -- Hardcoded Data just for layout purpose:
      fakeStore: {
        currency: currencies['USD'],
        groupMembersTotal: 7,
        groupPledgeGoal: 800,
        mincome: 500,
        othersPledges: [180, 130, 200]
      }
    }
  },
  computed: {
    maxIncome () {
      return this.fakeStore.mincome - 1
    },
    infoRequired () {
      return this.L('This information is required.')
    },
    hasLessIncome () {
      return this.$v.form.option.$model === 'no'
    },
    hasMinIncome () {
      return this.$v.form.option.$model === 'yes'
    },
    hasLessIncomeError () {
      if (!this.formVerified && this.$v.form.income.maxValue) {
        return null
      }

      if (!this.$v.form.income.requiredIf) {
        return this.infoRequired
      } else if (!this.$v.form.income.maxValue) {
        return this.L('If your income is the same or higher than the group\'s mincome change your answer to "Yes, I do"')
      }
    },
    hasMinIncomeError () {
      return this.formVerified && this.$v.form.pledge.$invalid ? this.infoRequired : null
    },
    saveButtonText () {
      const verb = this.isFirstTime ? 'Add' : 'Save'

      if (!this.$v.form.option.$model) { return this.L('{verb} details', { verb }) }
      if (this.hasMinIncome) { return this.L('{verb} pledged details', { verb }) }
      if (this.hasLessIncome) { return this.L('{verb} income details', { verb }) }
    },

    // -- Pledge data
    graphPledgeData () {
      const { groupMembersTotal, groupPledgeGoal, mincome, othersPledges } = this.fakeStore
      const othersAmount = othersPledges.reduce((acc, cur) => acc + cur, 0)
      const userAmount = this.hasMinIncome ? Number(this.$v.form.pledge.$model) : 0
      const userIncome = this.hasLessIncome ? Number(this.$v.form.income.$model) : 0
      const userIncomeNeeded = userIncome && userIncome < mincome ? mincome - userIncome : 0
      const totalAmount = othersAmount + userAmount
      const goal = groupPledgeGoal + userIncomeNeeded
      const members = othersPledges.length + (userAmount ? 1 : 0)
      const neededPledges = goal - totalAmount
      const surplus = totalAmount - groupPledgeGoal
      const membersNeedingPledges = groupMembersTotal - othersPledges.length
      const userToReceive = userIncomeNeeded ? userIncomeNeeded - (neededPledges / (membersNeedingPledges)) : 0 // Dumb algorithm just for layout purposes.

      return {
        members,
        othersAmount,
        userAmount,
        userToReceive,
        totalAmount,
        goal: groupPledgeGoal + userIncomeNeeded,
        avg: totalAmount / members,
        neededPledges: neededPledges > 0 ? neededPledges : false,
        surplus: surplus > 0 ? surplus : false
      }
    },
    groupPledgingSlices () {
      const { goal, othersAmount, userAmount, totalAmount, neededPledges, surplus } = this.graphPledgeData
      const circleCompleteAmount = Math.max(totalAmount + surplus, goal) // When bigger than goal, take in account the surplus slice
      const decimalSlice = (amount) => amount / circleCompleteAmount

      const slices = [
        {
          id: 'othersAmount',
          percent: decimalSlice(othersAmount),
          color: 'primary-light'
        }
      ]

      if (userAmount) {
        slices.push({
          name: 'userAmount',
          percent: decimalSlice(userAmount),
          color: 'primary-light'
        })
      }

      if (neededPledges) {
        slices.push({
          id: 'neededPledges',
          percent: decimalSlice(neededPledges),
          color: 'light'
        })
      } else if (surplus) {
        slices.push({
          id: 'surplus',
          percent: decimalSlice(surplus),
          color: 'secondary'
        })
      }

      console.log('slicesToRender', slices)
      return slices
    },
    groupPledgingLegend () {
      const { L } = this
      const { currency, groupMembersTotal } = this.fakeStore
      const { members, avg, totalAmount, neededPledges, surplus, userToReceive } = this.graphPledgeData

      const legend = [
        {
          label: L('Members Pledging'),
          value: L('{n} of {total}', { n: members, total: groupMembersTotal })
        },
        {
          label: L('Average Pledged'),
          value: `${currency}${avg}`
        },
        {
          label: L('Total Pledged'),
          value: `${currency}${totalAmount}`,
          color: 'primary-light'
        }
      ]

      if (neededPledges) {
        legend.push({
          label: L('Needed Pledges'),
          value: `${currency}${neededPledges}`,
          color: 'light'
        })
      } else if (surplus) {
        legend.push({
          label: L('Surplus (not needed)'),
          value: `${currency}${surplus}`,
          color: 'secondary'
        })
      }

      if (userToReceive) {
        legend.push({
          label: L('Pledge to receive'),
          value: `${currency}${userToReceive}`,
          color: 'tertiary'
        })
      }

      return legend
    }
  },
  methods: {
    verifyForm () {
      this.formVerified = true

      if (!this.$v.form.$invalid) {
        const makeIncome = this.$v.form.option.$model === 'yes'

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
      this.formVerified = false
    }
  },
  validations: {
    form: {
      option: {
        required
      },
      income: {
        requiredIf: requiredIf(model => model.option === 'no'),
        // REVIEW - how do it do this value dynamic?! this.mincome doesn't work
        maxValue: maxValue(499)
      },
      pledge: {
        requiredIf: requiredIf(model => model.option === 'yes')
      }
    }
  }
}
</script>
