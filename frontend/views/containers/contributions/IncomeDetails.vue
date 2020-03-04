<template lang='pug'>
modal-base-template(ref='modal' :fullscreen='true')
  .c-content
    i18n.is-title-2.c-title(tag='h2') Income Details

    form.card.c-card(
      @submit.prevent='submit'
      novalidate='true'
    )
      fieldset.field
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
          i18n(data-test='dontNeedsIncomeRadio') Yes, I do
        label.radio(v-error:incomeDetailsType='')
          input.input(
            type='radio'
            name='incomeDetailsType'
            value='incomeAmount'
            v-model='$v.form.incomeDetailsType.$model'
            @change='resetAmount'
          )
          i18n(data-test='needsIncomeRadio') No, I don't
      transition-expand
        fieldset(v-if='!!form.incomeDetailsType')
          label.field
            .label(
              data-test='introIncomeOrPledge'
            ) {{ needsIncome ? L("What's your monthly income?") : L('How much do you want to pledge?') }}
            .input-combo(
              :class='{"error": $v.form.amount.$error }'
              v-error:amount='{ attrs: { "data-test": "badIncome" } }'
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
          payment-methods.c-methods(v-if='needsIncome' ref='paymentMethods')

      banner-scoped(ref='formMsg')

      .buttons
        i18n.is-outlined(tag='button' type='button' @click='closeModal') Cancel
        i18n.is-success(
          tag='button'
          type='submit'
          :disabled='$v.form.$invalid'
          data-test='submitIncome'
        ) Save

    group-pledges-graph.c-graph(
      :type='form.incomeDetailsType'
      :amount='form.amount === "" ? undefined : +form.amount'
    )
</template>

<script>
import { mapGetters } from 'vuex'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import { decimals } from '@view-utils/validators.js'
import sbp from '~/shared/sbp.js'
import PaymentMethods from './PaymentMethods.vue'
import GroupPledgesGraph from './GroupPledgesGraph.vue'
import Tooltip from '@components/Tooltip.vue'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import TransitionExpand from '@components/TransitionExpand.vue'
import L from '@view-utils/translations.js'

export default {
  name: 'IncomeDetails',
  mixins: [validationMixin],
  components: {
    ModalBaseTemplate,
    TransitionExpand,
    BannerScoped,
    Tooltip,
    PaymentMethods,
    GroupPledgesGraph
  },
  data () {
    return {
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
      'ourUsername',
      'ourGroupProfile'
    ]),
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
    const incomeDetailsType = this.ourGroupProfile.incomeDetailsType
    if (incomeDetailsType) {
      this.form.incomeDetailsType = incomeDetailsType
      this.form.amount = this.ourGroupProfile[incomeDetailsType]
    }
  },
  methods: {
    resetAmount () {
      this.form.amount = this.form.incomeDetailsType === this.ourGroupProfile.incomeDetailsType ? this.ourGroupProfile[this.ourGroupProfile.incomeDetailsType] : ''
      this.$v.form.$reset()
    },
    closeModal () {
      this.$refs.modal.close()
    },
    async submit () {
      if (this.$v.form.$invalid) {
        this.$refs.formMsg.danger(L('Your income details are missing. Please review it and try again.'))
        return
      }

      const paymentMethods = {}

      if (this.needsIncome) {
        // Find the methods that have some info filled...
        const filledMethods = this.$refs.paymentMethods.form.methods.filter(method => method.name !== 'choose' || method.value)
        // From those, find a method with missing info
        const incompletedMethod = filledMethods.find(method => method.name === 'choose' || !method.value)
        // and warn the user about it, if necessary!
        if (incompletedMethod) {
          if (!incompletedMethod.value) {
            this.$refs.formMsg.danger(L('The method "{methodName}" is incomplete.', { methodName: incompletedMethod.name }))
          } else {
            this.$refs.formMsg.danger(L('The method name for "{methodValue}" is missing.', { methodValue: incompletedMethod.value }))
          }
          return
        }

        if (filledMethods.length > 0) {
          for (const method of filledMethods) {
            paymentMethods[method.name] = {
              value: method.value
            }
          }
        }
      }

      try {
        const incomeDetailsType = this.form.incomeDetailsType
        const groupProfileUpdate = await sbp('gi.contracts/group/groupProfileUpdate/create',
          {
            incomeDetailsType,
            [incomeDetailsType]: +this.form.amount,
            paymentMethods
          },
          this.$store.state.currentGroupId
        )
        await sbp('backend/publishLogEntry', groupProfileUpdate)
        this.closeModal()
      } catch (e) {
        console.error('Failed to update income details', e)
        this.$refs.formMsg.danger(L('Failed to update income details, please try again. {codeError}', { codeError: e.message }))
      }
    }
  },
  validations: {
    form: {
      incomeDetailsType: {
        [L('This field is required')]: required
      },
      amount: {
        [L('Oops, you entered a negative number')]: v => v >= 0,
        [L('The amount cannot have more than 2 decimals')]: decimals(2),
        [L('This field is required')]: required,
        [L('Your income must be lower than the group mincome')]: function (value) {
          return !this.needsIncome || value < this.groupSettings.mincomeAmount
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
  padding: $spacer*1.5 $spacer;

  @include tablet {
    padding: $spacer-lg $spacer*1.5;
  }

  @include desktop {
    padding: $spacer*2.5 $spacer*1.5;
  }
}

.c-content {
  display: grid;
  grid-template-areas:
    "title title"
    "graph graph"
    "card card";
  width: 100%;
  max-width: 55rem;
  margin-top: $spacer*1.5;

  @include tablet {
    grid-template-columns: auto 12rem;
    grid-column-gap: $spacer*1.5;
    grid-template-areas:
      "title title"
      "card graph";
    margin-top: $spacer*2.5;
  }

  @include desktop {
    grid-column-gap: $spacer-xl;
  }
}

.c-title {
  grid-area: title;
  margin-bottom: $spacer*2.5;

  @include tablet {
    margin-bottom: $spacer*1.5;
  }
}

.c-card {
  grid-area: card;
  align-self: flex-start;

  @include desktop {
    padding: 2.5rem;
  }
}

.c-methods {
  margin-top: $spacer*1.5;
}

.c-tip {
  display: inline-block;
  margin-left: $spacer-xs;
}

.c-graph {
  grid-area: graph;
  flex-shrink: 0;
  margin-bottom: $spacer*1.5;
}
</style>
