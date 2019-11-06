<template lang='pug'>
page(pageTestName='contributionsPage' pageTestHeaderName='contributionsTitle')
  template(#title='') {{ L('Contributions') }}

  callout-card(
    :isCard='true'
    data-test='addIncomeDetailsFirstCard'
    :title='L("Add your income details")'
    :svg='SvgContributions'
    v-if='!memberGroupProfile.incomeDetailsType'
  )
    i18n(tag='p') This will allow you to start receiving or giving mincome.
    i18n(
      tag='button'
      data-test='openIncomeDetailModal'
      @click='openModal("IncomeDetails")'
    ) Add income details

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
        data-test='openIncomeDetailModal'
        @click='openModal("IncomeDetails")'
      ) Change

    section.card.contribution-card
      .receiving
        i18n(tag='h3' class='card-header') Receiving
        i18n.has-text-1.spacer-around(
          v-if='!doesReceive'
          tag='p'
        ) When other members pledge a monetary or non-monetary contribution, they will appear here.

        i18n.has-text-1.spacer-around(
          v-else-if='needsIncome && !hasPayments'
          tag='p'
        ) No one is pledging money at the moment.

        ul.spacer(
          v-if='doesReceive'
          data-test='revceivingList'
        )
          contribution(
            v-if='needsIncome && hasPayments'
          )
            contribution-item(
              :what='receivingMonetary.total'
              :who='receivingMonetary.list'
              type='MONETARY'
            )

          contribution(
            v-for='(contribution, index) in receivingNonMonetary'
            :key='`contribution-${index}`'
          )
            contribution-item(
              :what='contribution.what'
              :who='contribution.who'
              type='NON_MONETARY'
            )

        button.button.is-small(
          v-if='groupMembersCount === 0'
          @click='openModal("InviteByLink")'
        )
          i.icon-plus
          i18n Add members to group

      .giving
        i18n(tag='h3' class='card-header') Giving

        i18n.has-text-1.spacer-around(
          v-if='!doesGive'
          tag='p'
        ) You can contribute to your group with money or other valuables like teaching skills, sharing your time ot help someone. The sky is the limit!

        i18n.has-text-1.spacer-around(
          v-else-if='!hasPayments'
          tag='p'
        ) No one needs monetary contributions at the moment.

        ul(
          v-if='doesGive'
          data-test='givingList'
        )
          contribution(
            v-if='hasPayments'
          )
            contribution-item(
              :what='givingMonetary.total'
              :who='givingMonetary.list'
              type='MONETARY'
              action='GIVING'
            )

          contribution.has-text-weight-bold(
            v-for='(contribution, index) in memberGroupProfile.nonMonetaryContributions'
            :key='`contribution-${index}`'
            variant='editable'
            :contributions-list='memberGroupProfile.nonMonetaryContributions'
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
            :contributions-list='memberGroupProfile.nonMonetaryContributions'
            @new-value='handleNonMonetary'
            data-test='addNonMonetaryContribution'
          )
            i.icon-plus(aria-hidden='true')
            i18n Add a non-monetary pledge
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import CalloutCard from '@components/CalloutCard.vue'
import SvgContributions from '@svgs/contributions.svg'
import Page from '@pages/Page.vue'
import PageSection from '@components/PageSection.vue'
import currencies from '@view-utils/currencies.js'
import GroupMincome from '@containers/sidebar/GroupMincome.vue'
import Contribution from '@components/Contribution.vue'
import ContributionItem from '@components/ContributionItem.vue'

export default {
  name: 'Contributions',
  components: {
    Page,
    PageSection,
    CalloutCard,
    GroupMincome,
    Contribution,
    ContributionItem,
    SvgContributions
  },
  data () {
    return {
      SvgContributions,
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
      'groupSettings',
      'groupMembersCount',
      'groupProfile',
      'groupProfiles',
      'thisMonthsPayments',
      'groupMincomeFormatted',
      'groupIncomeDistribution',
      'globalProfile'
    ]),
    memberGroupProfile () {
      return this.groupProfile(this.ourUsername)
    },
    upTo () {
      const amount = this.memberGroupProfile[this.memberGroupProfile.incomeDetailsType]
      if (!amount) return false
      return this.currency.displayWithCurrency(this.needsIncome ? this.groupSettings.mincomeAmount - amount : amount)
    },
    doesReceive () {
      return this.needsIncome || this.receivingNonMonetary.length > 0
    },
    doesGive () {
      return this.hasPayments || this.memberGroupProfile.nonMonetaryContributions.length > 0
    },
    needsIncome () {
      return this.memberGroupProfile.incomeDetailsType === 'incomeAmount'
    },
    hasPayments () {
      return Object.keys(this.givingMonetary.list).length > 0
    },
    currency () {
      return currencies[this.groupSettings.mincomeCurrency]
    },
    distribution () {
      return this.thisMonthsPayments.frozenDistribution || this.groupIncomeDistribution
    },
    receivingNonMonetary () {
      const groupProfiles = this.groupProfiles
      // TODO to optimize in the future
      return Object.keys(groupProfiles)
        .filter(key => key !== this.ourUsername && groupProfiles[key].nonMonetaryContributions.length > 0)
        .reduce((list, username) => {
          const nonMonetary = groupProfiles[username].nonMonetaryContributions
          nonMonetary.forEach((what) => {
            const contributionIndex = list.findIndex(x => x.what === what)
            const displayName = this.displayName(username)
            contributionIndex >= 0
              ? list[contributionIndex].who.push(displayName)
              : list.push({ who: [displayName], what })
          })
          return list
        }, [])
    },
    receivingMonetary () {
      const distributionTo = this.distribution.filter(p => p.to === this.ourUsername)
      const list = []
      const total = this.currency.displayWithCurrency(
        distributionTo.reduce((acc, payment) => {
          list.push(this.displayName(payment.from))
          return acc + payment.amount
        }, 0)
      )
      return {
        list: list,
        total: total
      }
    },
    givingMonetary () {
      const distributionTo = this.distribution.filter(p => p.from === this.ourUsername)
      const list = []
      const total = this.currency.displayWithCurrency(
        distributionTo.reduce((acc, payment) => {
          list.push(this.displayName(payment.to))
          return acc + payment.amount
        }, 0)
      )
      return {
        list: list,
        total: total
      }
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
        const groupProfileUpdate = await sbp('gi.contracts/group/groupProfileUpdate/create',
          { [type]: value },
          this.$store.state.currentGroupId
        )
        await sbp('backend/publishLogEntry', groupProfileUpdate)
      } catch (e) {
        console.error('handleNonMonetary', e)
        alert(e.message)
      }
    },
    displayName (username) {
      return this.globalProfile(username).displayName || username
    }
  }
}
</script>

<style lang="scss">
@import "@assets/style/_variables.scss";
.c-contribution-header .has-text-bold {
  font-family: "Poppins";
  padding-left: $spacer-sm;
}
</style>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
.c-contribution-header {
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
    margin-bottom: $spacer * 1;
  }
}
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
