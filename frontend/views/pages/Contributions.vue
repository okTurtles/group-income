<template lang='pug'>
page(pageTestName='contributionsPage' pageTestHeaderName='contributionsTitle')
  template(#title='') {{ L('Contributions') }}

  page-section.c-card-empty(v-if='true')
    svg-contributions.c-svg
    div
      i18n(tag='h3') Add your income details
      i18n.c-text(tag='p') This will allow you to start receiving or giving mincome.
      i18n(tag='button' @click='openModal("IncomeDetails")') Add income details

  section.card
    i18n(tag='h2' class='card-header') Receiving

    ul.c-ul
      contribution(
        v-for='(contribution, index) in fakeStore.receiving.nonMonetary'
        :key='`contribution-${index}`'
      )
        //- TODO: verify this is safe (no XSS)
        span(v-html='textReceivingNonMonetary(contribution)')
        text-who(:who='contribution.who')

      contribution(
        v-if='doesReceiveMonetary'
        variant='editable'
        ismonetary=''
        @interaction='handleFormTriggerClick'
      )
        //- TODO: verify this is safe (no XSS)
        span(v-html='textReceivingMonetary(fakeStore.receiving.monetary)')
        text-who(:who='fakeStore.groupMembersPledging')
        i18n each month

  section.card
    i18n(tag='h2' class='card-header') Giving
    ul
      contribution.has-text-weight-bold(
        v-for='(contribution, index) in fakeStore.giving.nonMonetary'
        :key='`contribution-${index}`'
        variant='editable'
        @new-value='(value) => handleEditNonMonetary(value, index)'
      ) {{contribution}}

      contribution(
        variant='unfilled'
        @new-value='submitAddNonMonetary'
      )
        i.icon-heart(aria-hidden='true')
        i18n Add a non-monetary method

    contribution(
      v-if='doesGiveMonetary'
      variant='editable'
      ismonetary=''
      @interaction='handleFormTriggerClick'
    )
      //- TODO: use displayWithCurrency!
      i18n(
        :args='{amount:`${fakeStore.currency}${fakeStore.giving.monetary}`}'
      ) Pledging up to {amount}
      i18n to other's mincome
      i18n(
        v-if='fakeStore.giving.monetary == 0' :args='{amount: "[$170]"}'
        tag='p'
      ) (The group's average pledge is {amount})

    message-missing-income(
      v-if='fakeStore.isFirstTime && !ephemeral.isEditingIncome'
      @click='handleFormTriggerClick'
    )

  page-section(title='Debug Income Details')
    form(
      novalidate
      @submit.prevent='setPaymentInfo'
    )
      // TODO: change this so that the input *inside* of the label
      //       as Sandrina describes here (using a fieldset):
      //       https://github.com/okTurtles/group-income-simple/pull/705#discussion_r335817744
      .field
        i18n.label(
          tag='label'
          :args='{ groupMincomeFormatted }'
        ) Do you make at least {groupMincomeFormatted} per month?

        .radio-wrapper
          input.radio(
            type='radio'
            value='incomeAmount'
            v-model='form.incomeDetailsType'
            id='radio-receiving'
          )
          //- TODO: update design system to make radio buttons use labels instead of spans (and update _forms.scss accordingly)
          i18n(tag='label' for='radio-receiving') No, I don't

        .radio-wrapper
          input.radio(
            type='radio'
            value='pledgeAmount'
            v-model='form.incomeDetailsType'
            id='radio-pleding'
          )
          i18n(tag='label' for='radio-pleding') Yes, I do

      //- NOTE: this "key='formReceiving'" is needed or else the v-if doesn't work
      //- for some reason...
      .field(v-if='form.incomeDetailsType === "incomeAmount"' key='formReceiving')
        i18n.label(tag='label') Enter your income:
        input.input.is-primary(
          type='text'
          v-model='$v.form.incomeAmount.$model'
          :class='{error: $v.form.incomeAmount.$error}'
          v-error:incomeAmount='{ tag: "p", attrs: { "data-test": "badIncome" } }'
        )

      .field(v-else='')
        i18n.label(tag='label') Enter pledge amount:
        input.input.is-primary(
          type='text'
          v-model='$v.form.pledgeAmount.$model'
          :class='{error: $v.form.pledgeAmount.$error}'
        )

      i18n.is-small(
        tag='button'
        type='submit'
        :disabled='$v.form.$invalid'
      ) Set payment info

  template(#sidebar='')
    group-mincome
</template>

<script>
import sbp from '~/shared/sbp.js'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import { OPEN_MODAL } from '@utils/events.js'
import SvgContributions from '@svgs/contributions.svg'
import { decimals } from '@view-utils/validators.js'
import { mapGetters } from 'vuex'
import Page from '@pages/Page.vue'
import PageSection from '@components/PageSection.vue'
import currencies from '@view-utils/currencies.js'
import MessageMissingIncome from '@containers/contributions/MessageMissingIncome.vue'
import GroupMincome from '@containers/sidebar/GroupMincome.vue'
import Contribution from '@components/Contribution.vue'
import TextWho from '@components/TextWho.vue'
import L from '@view-utils/translations.js'

export default {
  name: 'Contributions',
  mixins: [validationMixin],
  components: {
    Page,
    PageSection,
    GroupMincome,
    Contribution,
    TextWho,
    MessageMissingIncome,
    SvgContributions
  },
  data () {
    return {
      form: {
        incomeDetailsType: 'incomeAmount',
        incomeAmount: 0,
        pledgeAmount: 0
      },
      ephemeral: {
        isEditingIncome: false,
        isActive: true
      },
      // -- Hardcoded Data just for layout purposes:
      fakeStore: {
        currency: currencies.USD.symbol,
        isFirstTime: true, // true when user doesn't have any income details. It displays the 'Add Income Details' box
        mincome: 500,
        receiving: {
          nonMonetary: [
            {
              what: 'Cooking',
              who: 'Lilia Bouvet'
            },
            {
              what: 'Cuteness',
              who: ['Zoe Kim', 'Laurence E']
            }
          ],
          monetary: null // Number - You can edit to see the receiving monetary contribution box (change isFirstTime to false too).
        },
        giving: {
          nonMonetary: [], // ArrayOf(String)
          monetary: null // Number - You can eddit to see the giving monetary contribution box (change isFirstTime to false too).
        },
        groupMembersPledging: [
          'Jack Fisher',
          'Charlotte Doherty',
          'Thomas Baker',
          'Francisco Scott'
        ]
      }
    }
  },
  validations: {
    form: {
      incomeAmount: {
        [L('field is required')]: required,
        [L('cannot be negative')]: v => v >= 0,
        [L('cannot have more than 2 decimals')]: decimals(2)
      },
      pledgeAmount: { required, minValue: v => v >= 0, decimals: decimals(2) }
    }
  },
  computed: {
    ...mapGetters([
      'groupSettings',
      'memberProfile',
      'groupMincomeFormatted',
      'ourUsername'
    ]),
    doesReceiveMonetary () {
      return !!this.fakeStore.receiving.monetary && !this.ephemeral.isEditingIncome
    },
    doesGiveMonetary () {
      return !!this.fakeStore.giving.monetary && !this.ephemeral.isEditingIncome
    }
  },
  beforeMount () {
    const profile = this.memberProfile(this.ourUsername) || {}
    const incomeDetailsType = profile.groupProfile && profile.groupProfile.incomeDetailsType
    if (incomeDetailsType) {
      this.form.incomeDetailsType = incomeDetailsType
      this.form[incomeDetailsType] = profile.groupProfile[incomeDetailsType]
    }
  },
  methods: {
    openModal (modal) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal)
    },
    async setPaymentInfo () {
      if (this.$v.form.$invalid) {
        alert(L('Invalid payment info'))
        return
      }
      try {
        const incomeDetailsType = this.form.incomeDetailsType
        const groupProfileUpdate = await sbp('gi.contracts/group/groupProfileUpdate/create',
          {
            incomeDetailsType,
            [incomeDetailsType]: +this.form[incomeDetailsType]
          },
          this.$store.state.currentGroupId
        )
        await sbp('backend/publishLogEntry', groupProfileUpdate)
      } catch (e) {
        console.error('setPaymentInfo', e)
        alert(`Failed to update user's profile. Error: ${e.message}`)
      }
    },
    toggleMenu () {
      this.ephemeral.isActive = !this.ephemeral.isActive
    },

    textReceivingNonMonetary (contribution) {
      // REVIEW - Is it safe to use v-html here? Related #502
      return L('<strong>{what}</strong> from ', { what: contribution.what })
    },
    textReceivingMonetary (contribution) {
      return L('<strong>Up to {amount} for mincome</strong> from ', {
        amount: `${this.fakeStore.currency}${contribution}`
      })
    },

    submitAddNonMonetary (value) {
      console.log('TODO $store - submitAddNonMonetary')
      this.fakeStore.giving.nonMonetary.push(value) // Hardcoded Solution
    },
    handleEditNonMonetary (value, index) {
      if (!value) {
        console.log('TODO $store - deleteNonMonetary')
        this.fakeStore.giving.nonMonetary.splice(index, 1) // Hardcoded Solution
      } else {
        console.log('TODO $store - editNonMonetary')
        this.$set(this.fakeStore.giving.nonMonetary, index, value) // Hardcoded Solution
      }
    },
    handleFormTriggerClick () {
      this.ephemeral.isEditingIncome = true
    },
    handleIncomeSave ({ canPledge, amount }) {
      console.log('TODO $store - Save Income Details')
      // -- Hardcoded Solution
      this.fakeStore.receiving.monetary = canPledge ? null : this.fakeStore.mincome - amount
      this.fakeStore.giving.monetary = canPledge ? amount : null
      this.fakeStore.isFirstTime = false

      this.closeIncome()
    },
    handleIncomeCancel () {
      this.closeIncome()
    },
    closeIncome () {
      this.ephemeral.isEditingIncome = false
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";
.c-card-empty {
  display: flex;

  .c-svg {
    width: 4rem;
    height: 4rem;
    margin-right: $spacer;
    flex-shrink: 0;

    @include widescreen {
      width: 6.25rem;
      height: 6.25rem;
      margin-right: 2.5rem;
    }
  }
}
</style>
