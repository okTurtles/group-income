<template lang='pug'>
  page-section(:title='L("Contributions")')
    .c-widget
      .column
        h3.is-title-4.c-title {{ copy.payments.title }}
        .has-text-1(v-if='copy.payments.status') {{ copy.payments.status }}
        payments-summary(v-else)

        //-
          ::::CONTINUE HERE - TODO ::::
          - [ ] - payments Summary
          - [ ] - Copy / style for payments cta
          - [ ] - Responsive
          - [ ] - Reuse 'ourContributionSummary' at Contributions and IncomeDetailsPage
        //- v-if='copy.payments.cta'
        router-link.button.is-small.c-cta(
          to='/pay-group'
        ) {{ L('See payments') }}
      .column
        h3.is-title-4.c-title(v-html='copy.monetary.title')
        .has-text-1 {{ copy.monetary.status }}
        i18n.link.c-cta(tag='button' @click='openModal("IncomeDetails")') Change
      .column
        h3.is-title-4.c-title {{ copy.nonMonetary.title }}
        .has-text-1 {{ copy.nonMonetary.status }}
        router-link.link.c-cta(to='/contributions')
          | {{ L('See all contributions') }}
</template>

<script>
import { mapGetters } from 'vuex'
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'
import PageSection from '@components/PageSection.vue'
import L from '@view-utils/translations.js'
import currencies from '@view-utils/currencies.js'
import PaymentsSummary from '@containers/PaymentsSummary'

export default {
  name: 'ContributionsWidget',
  components: {
    PageSection,
    PaymentsSummary
  },
  computed: {
    ...mapGetters([
      'groupSettings',
      'currentGroupState',
      'groupProfiles',
      'ourUserIdentityContract',
      'ourUsername',
      'ourContributionSummary'
    ]),
    withCurrency () {
      return currencies[this.groupSettings.mincomeCurrency].displayWithCurrency
    },
    copy () {
      console.log(this.ourContributionSummary)
      const ourGroupProfile = this.groupProfiles[this.ourUsername]
      const needsIncome = ourGroupProfile.incomeDetailsType === 'incomeAmount'

      const {
        givesMonetary,
        givesNonMonetary,
        receivesMonetary,
        receivesNonMonetary
      } = this.ourContributionSummary

      const copy = {}

      if (needsIncome) {
        const title = L('Payments received')
        let status

        if (receivesMonetary) {
          status = ''
        } else {
          status = 'No members in the group are pledging yet! 😔'
        }
        copy.payments = { title, status }
      } else {
        const copyMonetaryTitle = (amount) => L('You are pledging {br_} {amount}', { ...this.LTags(), amount })
        const zeroCurrency = this.withCurrency(0)

        if (ourGroupProfile.pledgeAmount === 0) {
          copy.payments = {
            title: L('Payments'),
            status: L('[Make a pledge] to start contributing to other members')
          }
          copy.monetary = {
            title: copyMonetaryTitle(zeroCurrency),
            status: ''
          }
        } else {
          const title = L('Payments sent')
          let status

          if (givesMonetary) {
            status = ''
          } else {
            status = 'At the moment, no one is in need of contributions'
          }

          copy.payments = { title, status }

          copy.monetary = {
            title: copyMonetaryTitle(this.withCurrency(ourGroupProfile.pledgeAmount)),
            status: L('{amount} will be used.', {
              amount: givesMonetary ? givesMonetary.total : zeroCurrency
            })
          }
        }
      }

      copy.nonMonetary = (() => {
        const title = L('Non-monetary')
        let status

        if (receivesNonMonetary) {
          const count = receivesNonMonetary.who.length
          status = givesNonMonetary
            ? L('You and {count} other members are contributing.', { count })
            : L('{count} members are contributing.', { count })
        } else {
          status = givesNonMonetary
            ? L('You are contributing.')
            : L('There are no non-monetary contributions.')
        }

        return { title, status }
      })()

      return copy
    }
  },
  methods: {
    openModal (modal) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal)
    }
  }
}
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-widget {
  margin-top: $spacer;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  grid-column-gap: $spacer;
}

.c-title {
  margin-bottom: $spacer-sm;
}

.c-cta {
  margin-top: $spacer;
}
</style>
