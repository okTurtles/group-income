<template lang='pug'>
  page-section(:title='L("Contributions")')
    .c-widget(data-test='contributionsWidget')
      .c-column
        .c-status(v-if='copy.payments.title')
          h3.is-title-4.c-title(data-test='paymentsTitle') {{ copy.payments.title }}
          .has-text-1(
            data-test='paymentsStatus'
            v-html='copy.payments.status'
            @click='handlePaymentStatusClick'
          )
        payments-summary.c-status(v-else data-test='paymentsSummary')

        router-link.button.is-small(
          v-if='copy.payments.ctaText'
          to='/pay-group'
          :class='copy.payments.ctaClass'
        ) {{ copy.payments.ctaText }}
      .c-column
        h3.is-title-4.c-title(v-html='copy.monetary.title' data-test='monetaryTitle')
        .has-text-1.c-status(data-test='monetaryStatus') {{ copy.monetary.status }}
        i18n.link(tag='button' @click='openModal("IncomeDetails")') Change
      .c-column
        h3.is-title-4.c-title {{ copy.nonMonetary.title }}
        .has-text-1.c-status(data-test='nonMonetaryStatus') {{ copy.nonMonetary.status }}
        router-link.link(
          to='/contributions'
        ) {{ L('See all contributions') }}
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
      const {
        givingMonetary,
        givingNonMonetary,
        receivingMonetary,
        receivingNonMonetary
      } = this.ourContributionSummary

      const copy = {}

      if (receivingMonetary) {
        copy.payments = {
          title: !receivingMonetary.total && L('Payments received'),
          status: !receivingMonetary.total && L('No members in the group are pledging yet! 😔'),
          ctaText: receivingMonetary.total && L('See more')
        }

        copy.monetary = {
          title: L('You need {br_}{amount}', {
            ...this.LTags(),
            amount: this.withCurrency(receivingMonetary.needed)
          }),
          status: L('You will receive {amount}.', {
            amount: this.withCurrency(receivingMonetary.total)
          })
        }
      } else if (givingMonetary) {
        const copyMonetaryTitle = (amount) => L('You are pledging {br_}{amount}', {
          ...this.LTags(),
          amount: this.withCurrency(amount)
        })

        if (givingMonetary.pledged > 0) {
          const payedAll = false // TODO - connect with real data when PaymentsSystem is done.

          copy.payments = {
            title: !givingMonetary.total && L('Payments sent'),
            status: !givingMonetary.total && L('At the moment, no one is in need of contributions.'),
            ctaText: givingMonetary.total ? (payedAll ? L('Review payments') : L('Send payments')) : null,
            ctaClass: payedAll && 'is-outlined'
          }

          copy.monetary = {
            title: copyMonetaryTitle(givingMonetary.pledged),
            status: L('{amount} will be used.', {
              amount: this.withCurrency(givingMonetary.total)
            })
          }
        } else {
          copy.payments = {
            title: L('Payments'),
            status: L('{b1}Make a pledge{b2} to start contributing to other members.', {
              b1: '<button class="link js-btnPledge">',
              b2: '</button>'
            })
          }

          copy.monetary = {
            title: copyMonetaryTitle(givingMonetary.total)
          }
        }
      }

      copy.nonMonetary = (() => {
        let status

        if (receivingNonMonetary) {
          const count = receivingNonMonetary.who.length
          status = givingNonMonetary
            ? L('You and {count} other members are contributing.', { count })
            : L('{count} members are contributing.', { count })
        } else {
          status = givingNonMonetary
            ? L('You are contributing.')
            : L('There are no non-monetary contributions.')
        }

        return { title: L('Non-monetary'), status }
      })()

      return copy
    }
  },
  methods: {
    openModal (modal) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal)
    },
    handlePaymentStatusClick (e) {
      if (e.target.classList.contains('js-btnPledge')) {
        this.openModal('incomeDetails')
      }
    }
  }
}
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-widget {
  margin-top: $spacer;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    "payments payments"
    "monetary nonMonetary";
  grid-column-gap: $spacer*1.5;
  grid-row-gap: $spacer*1.5;

  @include tablet {
    grid-template-columns: 2fr 1fr 1fr;
    grid-template-areas: "payments monetary nonMonetary";
  }
}

.c-column {
  &:nth-child(1) { grid-area: payments; }
  &:nth-child(2) { grid-area: monetary; }
  &:nth-child(3) { grid-area: nonMonetary; }
}

.c-title {
  margin-bottom: $spacer-sm;
}

.c-status {
  margin-bottom: $spacer*1.5;
}
</style>
