<template lang='pug'>
modal-base-template(ref='modal' :fullscreen='true' :a11yTitle='L("Income Details")')
  .c-content
    i18n.is-title-2.c-title(tag='h2') Income Details

    form.card.c-card(
      @submit.prevent=''
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
          i18n(data-test='doesntNeedIncomeRadio') Yes, I do
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
            .inputgroup(
              :class='{"error": $v.form.amount.$error }'
              v-error:amount='{ attrs: { "data-test": "badIncome" } }'
            )
              input.input(
                inputmode='decimal'
                pattern='[0-9]*'
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
        button-submit.is-success(
          @click='submit'
          data-test='submitIncome'
        )
          i18n Save

    group-pledges-graph.c-graph(
      :type='form.incomeDetailsType'
      :amount='form.amount === "" ? undefined : normalizeCurrency(form.amount)'
    )
</template>

<script>
import { mapGetters } from 'vuex'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import currencies, { normalizeCurrency } from '@view-utils/currencies.js'
import sbp from '~/shared/sbp.js'
import PaymentMethods from './PaymentMethods.vue'
import GroupPledgesGraph from './GroupPledgesGraph.vue'
import Tooltip from '@components/Tooltip.vue'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import TransitionExpand from '@components/TransitionExpand.vue'
import L from '@view-utils/translations.js'

export default ({
  name: 'IncomeDetails',
  mixins: [validationMixin],
  components: {
    ModalBaseTemplate,
    TransitionExpand,
    BannerScoped,
    ButtonSubmit,
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
    this.form.amount = ''
    if (incomeDetailsType) {
      this.form.incomeDetailsType = incomeDetailsType
      this.form.amount = this.ourGroupProfile[incomeDetailsType]
    }
  },
  methods: {
    normalizeCurrency,
    resetAmount () {
      this.form.amount = this.form.incomeDetailsType === this.ourGroupProfile.incomeDetailsType ? this.ourGroupProfile[this.ourGroupProfile.incomeDetailsType] : ''
      this.$v.form.$reset()
    },
    closeModal () {
      this.$refs.modal.close()
    },
    async submit () {
      if (this.$v.form.$invalid) {
        this.$refs.formMsg.danger(L('Your income details are missing. Please review them and try again.'))
        return
      }

      const paymentMethods = []

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
            paymentMethods.push(method)
          }
        }
      }

      try {
        const incomeDetailsType = this.form.incomeDetailsType
        await sbp('gi.actions/group/groupProfileUpdate', {
          contractID: this.$store.state.currentGroupId,
          data: {
            incomeDetailsType,
            [incomeDetailsType]: normalizeCurrency(this.form.amount),
            paymentMethods
          }
        })
        this.closeModal()
      } catch (e) {
        console.error('IncomeDetails submit() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
    }
  },
  validations: {
    form: {
      incomeDetailsType: {
        [L('This field is required')]: required
      },
      amount: {
        [L('This field is required')]: required,
        [L('The amount must be a number (e.g. 100.75)')]: function (value) {
          return currencies[this.groupSettings.mincomeCurrency].validate(value)
        },
        [L('Oops, you entered a negative number')]: function (value) {
          return normalizeCurrency(value) >= 0
        },
        [L('Your income must be lower than the group mincome')]: function (value) {
          return !this.needsIncome || normalizeCurrency(value) < this.groupSettings.mincomeAmount
        }
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-content {
  display: grid;
  grid-template-areas:
    "title title"
    "graph graph"
    "card card";
  width: 100%;
  max-width: 55rem;
  margin-top: 1.5rem;

  @include tablet {
    grid-template-columns: auto 12rem;
    grid-column-gap: 1.5rem;
    grid-template-areas:
      "title title"
      "card graph";
    margin-top: 2.5rem;
  }

  @include desktop {
    grid-column-gap: 4rem;
  }
}

.c-title {
  grid-area: title;
  margin-bottom: 2.5rem;

  @include tablet {
    margin-bottom: 1.5rem;
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
  margin-top: 1.5rem;
}

.c-tip {
  display: inline-block;
  margin-left: 0.25rem;
}

.c-graph {
  grid-area: graph;
  flex-shrink: 0;
  margin-bottom: 1.5rem;
}
</style>
