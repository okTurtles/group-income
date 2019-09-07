<template lang="pug">
page(pageTestName='contributionsPage' pageTestHeaderName='contributionsTitle')
  template(#title='') {{ L('Contributions') }}

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
      i18n(
        :args='{amount:`${fakeStore.currency}${fakeStore.giving.monetary}`}'
      ) Pledging up to {amount}
      i18n to other&apos;s mincome
      i18n(
        v-if='fakeStore.giving.monetary == 0' :args="{amount: '[$170]'}"
        tag='p'
      ) (The group&apos;s average pledge is {amount})

    message-missing-income(
      v-if='fakeStore.isFirstTime && !ephemeral.isEditingIncome'
      @click='handleFormTriggerClick'
    )

    income-form(
      v-if='ephemeral.isEditingIncome'
      ref='incomeForm'
      @save='handleIncomeSave'
      @cancel='handleIncomeCancel'
    )

  template(#sidebar='')
    groups-min-income
</template>

<script>
import Page from '@pages/Page.vue'
import currencies from '@view-utils/currencies.js'
import MessageMissingIncome from '@containers/contributions/MessageMissingIncome.vue'
import IncomeForm from '@containers/contributions/IncomeForm.vue'
import GroupsMinIncome from '@containers/sidebar/GroupsMinIncome.vue'
import Contribution from '@components/Contribution.vue'
import TextWho from '@components/TextWho.vue'

export default {
  name: 'Contributions',
  components: {
    Page,
    GroupsMinIncome,
    Contribution,
    TextWho,
    IncomeForm,
    MessageMissingIncome
  },
  data () {
    return {
      ephemeral: {
        isEditingIncome: false,
        isActive: true
      },
      // -- Hardcoded Data just for layout purposes:
      fakeStore: {
        currency: currencies['USD'],
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
  computed: {
    doesReceiveMonetary () {
      return !!this.fakeStore.receiving.monetary && !this.ephemeral.isEditingIncome
    },
    doesGiveMonetary () {
      return !!this.fakeStore.giving.monetary && !this.ephemeral.isEditingIncome
    }
  },
  methods: {
    toggleMenu () {
      this.ephemeral.isActive = !this.ephemeral.isActive
    },

    textReceivingNonMonetary (contribution) {
      // REVIEW - Is it safe to use v-html here? Related #502
      return this.L('<strong>{what}</strong> from ', { what: contribution.what })
    },
    textReceivingMonetary (contribution) {
      return this.L('<strong>Up to {amount} for mincome</strong> from ', {
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
</style>
