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
            | {{ L('Do you make at least {groupMincomeFormatted} per month?', { groupMincomeFormatted }) }}
            tooltip(:text='L("This is the minimum income in your group")' direction='top')
              .button.is-icon-smaller.is-primary.c-tip
                i.icon-info
          label.radio
            input.input(
              type='radio'
              name='incomeDetailsType'
              value='pledgeAmount'
              v-model='$v.form.incomeDetailsType.$model'
              @change='resetAmount'
            )
            i18n(data-test='needsIncomeRadio') Yes, I do
          label.radio(v-error:incomeDetailsType='')
            input.input(
              type='radio'
              name='incomeDetailsType'
              value='incomeAmount'
              v-model='$v.form.incomeDetailsType.$model'
              @change='resetAmount'
            )
            i18n(data-test='dontNeedsIncomeRadio') No, I don't
        transition(name='expand')
          fieldset(v-if='!!form.incomeDetailsType')
            label.field
              .label(
                data-test='introIncomeOrPledge'
              ) {{ needsIncome ? L("What's your monthly income?") : L('How much do you want to pledge?') }}
              .input-combo(
                :class='{"error": $v.form.amount.$error }'
                v-error:amount='{ tag: "p", attrs: { "data-test": "badIncome" } }'
              )
                input.input(
                  type='number'
                  v-model='$v.form.amount.$model'
                  data-test='inputIncomeOrPledge'
                )
                .suffix {{ groupMincomeSymbolWithCode }}
              .helper(v-if='needsIncome && whoIsPledging.length')
                p {{ contributionMemberText }}
              i18n.helper(v-else-if='!needsIncome') Define up to how much you pledge to contribute to the group each month. Only the minimum needed amount will be given.
            payment-methods(selected='manual')
        .buttons
          //- NOTE: this type='button' is needed here to prevent the ENTER
          //-       key from calling closeModal twice
          i18n.is-outlined(tag='button' type='button' @click='closeModal') Cancel
          i18n.is-success(
            tag='button'
            type='submit'
            :disabled='$v.form.$invalid'
            data-test='submitIncome'
          ) Save
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
import { decimals } from '@view-utils/validators.js'
import sbp from '~/shared/sbp.js'
import InputAmount from './InputAmount.vue'
import PaymentMethods from './PaymentMethods.vue'
import Tooltip from '@components/Tooltip.vue'
import ModalBaseTemplate from '@components/Modal/ModalBaseTemplate.vue'
import GroupPledgesGraph from '../GroupPledgesGraph.vue'
import L from '@view-utils/translations.js'

export default {
  name: 'IncomeDetails',
  mixins: [validationMixin],
  components: {
    ModalBaseTemplate,
    InputAmount,
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
      }
    }
  },
  computed: {
    ...mapGetters([
      'groupSettings',
      'groupProfile',
      'groupProfiles',
      'groupMincomeFormatted',
      'groupMincomeSymbolWithCode',
      'ourUsername'
    ]),
    memberGroupProfile () {
      return this.groupProfile(this.ourUsername)
    },
    needsIncome () {
      return this.form.incomeDetailsType === 'incomeAmount'
    },
    whoIsPledging () {
      const groupProfiles = this.groupProfiles
      return Object.keys(groupProfiles).filter(username => {
        return groupProfiles[username].incomeDetailsType === 'pledgeAmount' && username !== this.ourUsername
      })
    },
    contributionMemberText () {
      const who = this.whoIsPledging
      switch (who.length) {
        case 1:
          return L('{firstMember} will ensure you meet the mincome', {
            firstMember: who[0]
          })
        case 2:
          return L('{firstMember} and {othersMember} will ensure you meet the mincome', {
            firstMember: who[0],
            othersMember: who[1]
          })
        default:
          return L('{firstMember} and {othersMembersCount} others will ensure you meet the mincome', {
            firstMember: who[0],
            othersMembersCount: who.length - 1
          })
      }
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
      this.form.amount = this.form.incomeDetailsType === this.memberGroupProfile.incomeDetailsType ? this.memberGroupProfile[this.memberGroupProfile.incomeDetailsType] : ''
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
      incomeDetailsType: {
        [L('This field is required')]: required
      },
      amount: {
        [L('cannot be negative')]: v => v >= 0,
        [L('cannot have more than 2 decimals')]: decimals(2),
        [L('This field is required')]: required,
        [L("It seems your income is not lower than the group's mincome.")]: function (value) {
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
@import "@assets/style/_variables.scss";

.wrapper-container {
  height: 100%;
  width: 100%;
  opacity: 1;
  background: $general_2;
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
