<template lang='pug'>
page(pageTestName='contributionsPage' pageTestHeaderName='contributionsTitle')
  template(#title='') {{ L('Contributions') }}

  add-income-details-widget(v-if='!ourGroupProfile.incomeDetailsType')

  template(v-else)
    .c-contribution-header
      .has-text-1
        i18n(
          v-if='needsIncome'
          tag='p'
          data-test='headerNeed'
          :args='{ amount: `<span class="has-text-bold has-text-0">${upTo}</span>` }'
        ) You need {amount}
        i18n(
          v-else
          tag='p'
          data-test='headerPledge'
          :args='{ upTo: `<span class="has-text-bold has-text-0">${upTo}</span>` }'
        ) You are pledging up to {upTo}

        i18n(
          tag='p'
          :args='{ paymentMethod: `<span class="has-text-bold has-text-0">${paymentMethod}</span>` }'
        ) Payment method {paymentMethod}

      i18n(
        tag='button'
        class='button is-small'
        data-test='openIncomeDetailsModal'
        @click='openModal("IncomeDetails")'
      ) Change

    section.card.contribution-card
      .receiving
        i18n.is-title-3(tag='h3' class='card-header') Receiving
        i18n.has-text-1.spacer-around(
          v-if='!doesReceiveAny'
          tag='p'
          data-test='receivingParagraph'
        ) When other members pledge a monetary or non-monetary contribution, they will appear here.

        i18n.has-text-1.spacer-around(
          v-else-if='needsIncome && !doesReceiveMonetary'
          tag='p'
          data-test='receivingParagraph'
        ) No one is pledging money at the moment.

        ul.spacer(
          v-if='doesReceiveAny'
          data-test='revceivingList'
        )
          contribution(
            v-if='doesReceiveMonetary'
          )
            contribution-item(
              :what='withCurrency(receivingMonetary.total)'
              :who='receivingMonetary.who'
              type='MONETARY'
            )

          template(v-if='receivingNonMonetary')
            contribution(
              v-for='(contribution, index) in receivingNonMonetary.what'
              :key='`contribution-${index}`'
            )
              contribution-item(
                :what='contribution.what'
                :who='contribution.who'
                type='NON_MONETARY'
              )

        button.button.is-small.c-cta(
          v-if='groupMembersCount === 1'
          @click='openModal("InvitationLinkModal")'
        )
          i.icon-plus.is-prefix
          i18n Add members to group

      .giving
        i18n.is-title-3(tag='h3' class='card-header') Giving

        i18n.has-text-1.spacer-around(
          v-if='notContributing'
          tag='p'
          data-test='givingParagraph'
        ) You can contribute to your group with money or other valuables like teaching skills, sharing your time to help someone. The sky is the limit!

        i18n.has-text-1.spacer-around(
          v-else-if='noOneToGive'
          data-test='givingParagraph'
          tag='p'
        ) No one needs monetary contributions at the moment. You can still add non-monetary contributions if you would like.

        ul(
          data-test='givingList'
        )
          contribution(
            v-if='doesGiveMonetary'
          )
            contribution-item(
              :what='withCurrency(givingMonetary.total)'
              :who='givingMonetary.who'
              type='MONETARY'
              action='GIVING'
            )

          contribution.has-text-weight-bold(
            v-for='(contribution, index) in ourGroupProfile.nonMonetaryContributions'
            :key='`contribution-${index}`'
            variant='editable'
            :contributions-list='ourGroupProfile.nonMonetaryContributions'
            :initial-value='contribution'
            @new-value='handleNonMonetary'
          )
            contribution-item(
              :what='contribution'
              type='NON_MONETARY'
              action='GIVING'
            )

          contribution(
            variant='unfilled'
            :contributions-list='ourGroupProfile.nonMonetaryContributions'
            @new-value='handleNonMonetary'
          )
            i.icon-plus.is-prefix
            i18n Add a non-monetary pledge
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import CalloutCard from '@components/CalloutCard.vue'
import Page from '@components/Page.vue'
import PageSection from '@components/PageSection.vue'
import currencies from '@view-utils/currencies.js'
import Contribution from '@containers/contributions/Contribution.vue'
import ContributionItem from '@containers/contributions/ContributionItem.vue'
import AddIncomeDetailsWidget from '@containers/contributions/AddIncomeDetailsWidget.vue'

export default ({
  name: 'Contributions',
  components: {
    Page,
    PageSection,
    CalloutCard,
    Contribution,
    ContributionItem,
    AddIncomeDetailsWidget
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
      paymentMethod: 'Manual' // static
    }
  },
  computed: {
    ...mapGetters([
      'ourUsername',
      'ourGroupProfile',
      'groupSettings',
      'groupMembersCount',
      'groupProfile',
      'groupProfiles',
      'groupMincomeFormatted',
      'globalProfile',
      'ourContributionSummary'
    ]),
    upTo () {
      const amount = this.ourGroupProfile[this.ourGroupProfile.incomeDetailsType]
      if (typeof amount !== 'number') return false
      return this.withCurrency(this.needsIncome ? this.groupSettings.mincomeAmount - amount : amount)
    },
    needsIncome () {
      return this.ourGroupProfile.incomeDetailsType === 'incomeAmount'
    },
    receivingNonMonetary () {
      return this.ourContributionSummary.receivingNonMonetary
    },
    receivingMonetary () {
      return this.ourContributionSummary.receivingMonetary
    },
    givingMonetary () {
      return this.ourContributionSummary.givingMonetary
    },
    doesReceiveNonMonetary () {
      return this.receivingNonMonetary && this.receivingNonMonetary.who.length > 0
    },
    doesReceiveMonetary () {
      return (this.receivingMonetary || {}).total > 0
    },
    doesReceiveAny () {
      return this.doesReceiveMonetary || this.doesReceiveNonMonetary
    },
    doesGiveMonetary () {
      return (this.givingMonetary || {}).total > 0
    },
    notContributing () {
      return this.needsIncome && !this.ourContributionSummary.givingNonMonetary
    },
    noOneToGive () {
      return (this.givingMonetary || {}).total === 0
    },
    currency () {
      return currencies[this.groupSettings.mincomeCurrency]
    }
  },
  beforeMount () {
    const profile = this.groupProfile(this.ourUsername) || {}
    const incomeDetailsType = profile.incomeDetailsType
    if (incomeDetailsType) {
      this.form.incomeDetailsType = incomeDetailsType
      this.form[incomeDetailsType] = profile[incomeDetailsType]
    }
  },
  methods: {
    openModal (modal) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal)
    },
    async handleNonMonetary (type, value) {
      try {
        await sbp('gi.actions/group/groupProfileUpdate', {
          data: { [type]: value },
          contractID: this.$store.state.currentGroupId
        })
      } catch (e) {
        alert(e.message)
      }
    },
    displayName (username) {
      return this.globalProfile(username).displayName || username
    },
    withCurrency (amount) {
      return this.currency.displayWithCurrency(amount)
    }
  }
}: Object)
</script>

<style lang="scss">
@import "@assets/style/_variables.scss";

.c-contribution-header .has-text-bold {
  font-family: "Poppins";
  padding-left: 0.5rem;
}
</style>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-contribution-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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

.c-cta {
  margin-top: 1.5rem;

  @include phone {
    margin-bottom: 4rem;
  }
}

.spacer-around {
  margin: 0 0 1rem 0;

  @include tablet {
    margin: 1rem 0 0;
  }
}

.spacer {
  margin-bottom: 2.5rem;

  @include tablet {
    margin-bottom: 1rem;
  }
}

.c-card-empty {
  display: flex;

  .c-svg {
    width: 4rem;
    height: 4rem;
    margin-right: 1rem;
    flex-shrink: 0;

    @include desktop {
      width: 6.25rem;
      height: 6.25rem;
      margin-right: 2.5rem;
    }
  }
}
</style>
