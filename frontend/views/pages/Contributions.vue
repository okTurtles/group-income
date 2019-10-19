<template lang='pug'>
page(pageTestName='contributionsPage' pageTestHeaderName='contributionsTitle')
  template(#title='') {{ L('Contributions') }}

  .contribution-header
    .has-text-1
      i18n(
        v-if='fakeStore.receiving.monetary'
        tag='p'
        :args='{upTo: fakeStore.upTo, currency: fakeStore.currency}'
        html='You need <span class="has-text-extra-bold has-text-0">{currency}{upTo}</span>'
      )
      i18n(
        v-else
        tag='p'
        :args='{upTo: fakeStore.upTo, currency: fakeStore.currency}'
        html='You are pledging up to <span class="has-text-extra-bold has-text-0">{currency}{upTo}</span>'
      )

      i18n(
        tag='p'
        :args='{paymentMethod: fakeStore.paymentMethod}'
        html='Payment method <span class="has-text-extra-bold has-text-0">{paymentMethod}</span>'
      )

    div
      button.button.is-small(
        @click='open("IncomeDetails")'
      ) Change

  section.card.contribution-card
    .receiving
      i18n(tag='h2' class='card-header') Receiving

      i18n.has-text-1.spacer-around(
        v-if='!doesReceive'
        tag='p'
      ) When other members pledge a monetary or non-monetary contribution, they will appear here.

      i18n.has-text-1.spacer-around(
        v-else-if='!fakeStore.receiving.monetary'
        tag='p'
      ) No one is pledging money at the moment.

      ul.spacer(v-if='doesReceive')
        contribution(
          v-if='fakeStore.receiving.monetary'
          is-monetary=true
        )
          contribution-item(
            :what='fakeStore.currency + fakeStore.receiving.monetary'
            :who='fakeStore.groupMembersPledging'
            type='MONETARY'
          )

        contribution(
          v-for='(contribution, index) in fakeStore.receiving.nonMonetary'
          :key='`contribution-${index}`'
        )
          contribution-item(
            :what='contribution.what'
            :who='contribution.who'
            type='NON_MONETARY'
          )

      button.button.is-small(
        v-if='groupMembersCount === 0'
        @click='open("InviteByLink")'
      )
        i.icon-plus
        i18n Add members to group

    .giving
      i18n(tag='h2' class='card-header') Giving

      i18n.has-text-1.spacer-around(
        v-if='!doesGive'
        tag='p'
      ) You can contribute to your group with money or other valuables like teaching skills, sharing your time ot help someone. The sky is the limit!

      i18n.has-text-1.spacer-around(
        v-else-if='!fakeStore.giving.monetary'
        tag='p'
      ) No one needs monetary contributions at the moment.

      ul.spacer(v-if='doesGive')
        contribution(
          v-if='fakeStore.giving.monetary'
          is-monetary=true
        )
          contribution-item(
            :what='fakeStore.currency + fakeStore.giving.monetary'
            :who='fakeStore.groupMembersPledging'
            type='MONETARY'
            action='GIVING'
          )

        contribution.has-text-weight-bold(
          v-for='(contribution, index) in fakeStore.giving.nonMonetary'
          :key='`contribution-${index}`'
          variant='editable'
          @new-value='(value) => handleEditNonMonetary(value, index)'
        )
          contribution-item(
            :what='contribution'
            type='NON_MONETARY'
            action='GIVING'
          )

        contribution(
          variant='unfilled'
          @new-value='submitAddNonMonetary'
        )
          i.icon-plus(aria-hidden='true')
          i18n Add a non-monetary pledge

      income-form(
        v-if='ephemeral.isEditingIncome'
        ref='incomeForm'
        @save='handleIncomeSave'
        @cancel='handleIncomeCancel'
      )
</template>

<script>
import { mapGetters } from 'vuex'
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'
import Page from '@pages/Page.vue'
import currencies from '@view-utils/currencies.js'
import IncomeForm from '@containers/contributions/IncomeForm.vue'
import GroupMincome from '@containers/sidebar/GroupMincome.vue'
import Contribution from '@components/Contribution.vue'
import ContributionItem from '@components/ContributionItem.vue'

export default {
  name: 'Contributions',
  components: {
    Page,
    GroupMincome,
    Contribution,
    ContributionItem,
    IncomeForm
  },
  data () {
    return {
      ephemeral: {
        isEditingIncome: false,
        isActive: true
      },
      // -- Hardcoded Data just for layout purposes:
      fakeStore: {
        upTo: 400,
        paymentMethod: 'Manual',
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
          monetary: 100
        },
        giving: {
          nonMonetary: [
            'Happiness'
          ],
          monetary: 20
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
    ...mapGetters([
      'groupMembersCount'
    ]),
    doesReceive () {
      return this.fakeStore.receiving.monetary || this.fakeStore.receiving.nonMonetary
    },
    doesGive () {
      return this.fakeStore.giving.monetary || this.fakeStore.giving.nonMonetary
    }
  },
  methods: {
    toggleMenu () {
      this.ephemeral.isActive = !this.ephemeral.isActive
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
    },
    open (modal) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";
.contribution-header {
  display: flex;
  justify-content: space-between;
  padding: 1rem 0 1.5rem 0;

  button {
    margin-top: -0.25rem;
  }

  @include tablet {
    padding-top: 0;

    p {
      float: left;
      margin-right: 1.5rem;
    }
  }
}

.contribution-card {

  @include tablet {
    display: flex;
    justify-content: space-between;

    > div {
      width: calc(50% - 1rem);
    }
  }
}

.spacer-around {
  margin: 0 0 1rem 0;

  @include tablet {
    margin: $spacer 0;
  }
}

.spacer {
  margin-bottom: $spacer * 2.5;

  @include tablet {
    margin-bottom: $spacer * 1.5;
  }
}
</style>
