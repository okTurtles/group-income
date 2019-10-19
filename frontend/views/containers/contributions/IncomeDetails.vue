<template lang='pug'>
modal-base-template(ref='modal')
  .wrapper-container
    .c-content
      i18n.c-title(tag='h2') Income Details

      form.card.c-card(
        @submit.prevent='submit'
        novalidate='true'
      )
        fieldset.c-firstQuestion
          legend.label
<<<<<<< HEAD
<<<<<<< HEAD
            | {{ L('Do you make at least {groupMincomeFormatted} per month?', { groupMincomeFormatted }) }}
            tooltip(:text='L("This is the minimum income in your group")' direction='top')
              .button.is-icon-smaller.is-primary.c-tip
<<<<<<< HEAD
=======
            | {{ L('Do you make at least {value} per month?', { value: `${groupSettings.mincomeAmount}${currency}`}) }}
            tooltip(:text='L("This is the minimum income in your group")')
=======
            | {{ L('Do you make at least {groupMincomeFormatted} per month?', { groupMincomeFormatted }) }}
            tooltip(:text='L("This is the minimum income in your group")' direction='top')
>>>>>>> Update Income Details with v-error
              button.is-icon-smaller.is-primary.c-tip(:aria-label='L("This is the minimum income in your group")')
>>>>>>> DS: add input shifted and icon-smaller examples
=======
>>>>>>> Changes based on greg and margarida feedback
                i.icon-info
          label.radio
            input.input(
              type='radio'
              name='incomeDetailsType'
              value='pledgeAmount'
              v-model='$v.form.incomeDetailsType.$model'
              @change='resetAmount'
            )
            i18n Yes, I do
<<<<<<< HEAD
          label.radio(v-error:incomeDetailsType='')
=======
          label.radio(v-error:incomeDetailsKey='')
>>>>>>> Changes based on greg and margarida feedback
            input.input(
              type='radio'
              name='incomeDetailsType'
              value='incomeAmount'
              v-model='$v.form.incomeDetailsType.$model'
              @change='resetAmount'
            )
            i18n No, I don't
        transition(name='expand')
          fieldset(v-if='!!form.incomeDetailsType')
            label.field
<<<<<<< HEAD
<<<<<<< HEAD
              .label {{ needsIncome ? L("What's your monthly income?") : L('How much do you want to pledge?') }}
=======
              .label {{ canPledge ? L('How much do you want to pledge?') : L('What\'s your monthly income?') }}
>>>>>>> Update Income Details with v-error
=======
              .label {{ needsIncome ? L("What's your monthly income?") : L('How much do you want to pledge?') }}
>>>>>>> Changes based on greg and margarida feedback
              .input-combo(
                :class='{"error": $v.form.amount.$error }'
                v-error:amount=''
              )
                input.input(
                  type='number'
                  v-model='$v.form.amount.$model'
                )
<<<<<<< HEAD
<<<<<<< HEAD
                .suffix {{ groupMincomeSymbolWithCode }}
              .helper(v-if='needsIncome && whoIsPledging.length')
                text-who(:who='whoIsPledging')
=======
                .suffix [$ USD]
              i18n.helper(v-if='canPledge') Define up to how much you pledge to contribute to the group each month. Only the minimum needed amount will be given.
              .helper(v-else)
                text-who(:who='["[Rick]", "[Carl]", "[Kim]"]')
>>>>>>> Update Income Details with v-error
=======
                .suffix {{ groupMincomeSymbolWithCode }}
              .helper(v-if='needsIncome && whoIsPledging.length')
                text-who(:who='whoIsPledging')
>>>>>>> Changes based on greg and margarida feedback
                | &nbsp
                i18n will ensure you meet the mincome
              i18n.helper(v-else-if='!needsIncome') Define up to how much you pledge to contribute to the group each month. Only the minimum needed amount will be given.
            payment-methods(selected='manual')
        .buttons
          i18n.is-outlined(tag='button' @click='closeModal') Cancel
          i18n.is-success(tag='button' type='submit' :disabled='$v.form.$invalid') Save
        // TODO/OPTIMIZE - create directive similar to vError
        .c-feedback.has-text-1(
          v-if='ephemeral.formFeedbackMsg.text'
          :class='ephemeral.formFeedbackMsg.class'
        ) {{ephemeral.formFeedbackMsg.text}}
      .c-graph
        | WIP: A graph is on its way!
        //
          group-pledges-graph.c-graph(
            :userpledgeamount='!needsIncome && !!form.pledge ? Number(form.pledge) : null'
            :userincomeamount='needsIncome && !!form.income ? Number(form.income) : null'
          )
</template>

<script>
import { mapGetters } from 'vuex'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import sbp from '~/shared/sbp.js'
import InputAmount from './InputAmount.vue'
import PaymentMethods from './PaymentMethods.vue'
import Tooltip from '@components/Tooltip.vue'
import ModalBaseTemplate from '@components/Modal/ModalBaseTemplate.vue'
import TextWho from '@components/TextWho.vue'
import GroupPledgesGraph from '../GroupPledgesGraph.vue'
import L from '@view-utils/translations.js'

export default {
  name: 'IncomeDetails',
  mixins: [validationMixin],
  components: {
    ModalBaseTemplate,
    InputAmount,
    TextWho,
    Tooltip,
    PaymentMethods,
    GroupPledgesGraph
  },
  data () {
    return {
      ephemeral: {
        formFeedbackMsg: {}
      },
      form: {
        incomeDetailsType: null,
        amount: null
      },
      fakeStore: {
        incomeDetailsType: 'pledgeAmount', // incomeAmount || pledgeAmount
        amount: 100
      }
    }
  },
  computed: {
    ...mapGetters([
      'groupMembers',
      'groupSettings',
      'memberProfile',
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> Changes based on greg and margarida feedback
      'groupMincomeFormatted',
      'groupMincomeSymbolWithCode',
      'ourUsername',
      'groupMembersByUsername'
<<<<<<< HEAD
=======
      'groupMincomeFormatted'
>>>>>>> Update Income Details with v-error
=======
>>>>>>> Changes based on greg and margarida feedback
    ]),
    memberGroupProfile () {
      const profile = this.memberProfile(this.ourUsername) || {}
      return profile.groupProfile || {}
    },
    needsIncome () {
<<<<<<< HEAD
      return this.form.incomeDetailsType === 'incomeAmount'
    },
    whoIsPledging () {
      return this.groupMembersByUsername.filter(username => this.groupMembers[username].groupProfile.incomeDetailsType === 'pledgeAmount' && username !== this.ourUsername)
=======
      return this.form.incomeDetailsKey === 'incomeAmount'
    },
<<<<<<< HEAD
    canPledge () {
      return this.form.incomeDetailsKey === 'pledgeAmount'
>>>>>>> Update Income Details with v-error
=======
    whoIsPledging () {
      return this.groupMembersByUsername.filter(username => this.groupMembers[username].groupProfile.incomeDetailsKey === 'pledgeAmount' && username !== this.ourUsername)
>>>>>>> Changes based on greg and margarida feedback
    }
  },
  created () {
    const incomeDetailsType = this.memberGroupProfile.incomeDetailsType
    if (incomeDetailsType) {
      this.form.incomeDetailsType = incomeDetailsType
      this.form.amount = this.memberGroupProfile[incomeDetailsType]
    }
  },
  methods: {
    resetAmount () {
<<<<<<< HEAD
      this.form.amount = this.form.incomeDetailsType === this.memberGroupProfile.incomeDetailsType ? this.memberGroupProfile[this.memberGroupProfile.incomeDetailsType] : ''
=======
      this.form.amount = this.form.incomeDetailsKey === this.memberGroupProfile.incomeDetailsKey ? this.memberGroupProfile[this.memberGroupProfile.incomeDetailsKey] : ''
>>>>>>> Update Income Details with v-error
      this.$v.form.$reset()
    },
    closeModal () {
      this.$refs.modal.close()
    },
    async submit () {
      if (this.$v.form.$invalid) {
        alert(L('Invalid payment info'))
        return
      }
      try {
        const incomeDetailsType = this.form.incomeDetailsType
        const groupProfileUpdate = await sbp('gi.contracts/group/groupProfileUpdate/create',
          {
            incomeDetailsType,
            [incomeDetailsType]: +this.form.amount
          },
          this.$store.state.currentGroupId
        )
        await sbp('backend/publishLogEntry', groupProfileUpdate)
        this.closeModal()
      } catch (e) {
        console.error('setPaymentInfo', e)
        this.ephemeral.formFeedbackMsg = {
          text: L(`Failed to update income details. Error: ${e.message}`),
          class: 'has-text-danger'
        }
      }
    }
  },
  validations: {
    form: {
<<<<<<< HEAD
      incomeDetailsType: {
=======
      incomeDetailsKey: {
>>>>>>> Update Income Details with v-error
        [L('This field is required')]: required
      },
      amount: {
        [L('This field is required')]: required,
<<<<<<< HEAD
<<<<<<< HEAD
        [L("It seems your income is not lower than the group's mincome.")]: function (value) {
=======
        [L('It seems your income is not lower than the group\'s mincome.')]: function (value) {
>>>>>>> Update Income Details with v-error
=======
        [L("It seems your income is not lower than the group's mincome.")]: function (value) {
>>>>>>> Changes based on greg and margarida feedback
          if (this.needsIncome) {
            return value < this.groupSettings.mincomeAmount - 1
          }
          return true
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.wrapper-container {
  height: 100%;
  width: 100%;
  opacity: 1;
  background: $general_0;
  padding: 3rem $spacer-lg
}

.c-content {
  display: grid;
  grid-template-columns: auto 14rem;
  grid-column-gap: $spacer-xl;
  grid-template-areas:
    "title title"
    "graph graph"
    "card card";
  max-width: 55rem;
  margin: 0 auto;

  @include tablet {
    grid-template-areas:
      "title title"
      "card graph";
  }
}

.c-title {
  grid-area: title;
  margin-bottom: $spacer;
}

.c-card {
  grid-area: card;
  margin-top: $spacer-sm;
  padding: 2.5rem;
}

.c-tip {
  display: inline-block;
  margin-left: $spacer-xs;
}

.c-firstQuestion {
  margin-bottom: 1.5rem;
}

.c-feedback {
  text-align: center;
  margin-top: $spacer-sm;
}

.c-graph {
  grid-area: graph;
  flex-shrink: 0;
}
</style>
