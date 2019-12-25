<template lang='pug'>
  page-section(:title='L("Contributions")')
    .c-widget
      .c-column
        div(v-if='copy.payments.title')
          h3.is-title-4.c-title {{ copy.payments.title }}
          .has-text-1(
            v-if='copy.payments.text'
            v-html='copy.payments.text'
            @click='handlePaymentTextClick'
          )
        payments-summary(v-else)

        router-link.button.is-small.c-cta(
          v-if='copy.payments.ctaText'
          to='/pay-group'
          :class='copy.payments.ctaClass'
        ) {{ copy.payments.ctaText }}
      .c-column
        h3.is-title-4.c-title(v-html='copy.monetary.title')
        .has-text-1 {{ copy.monetary.text }}
        i18n.link.c-cta(tag='button' @click='openModal("IncomeDetails")') Change
      .c-column
        h3.is-title-4.c-title {{ copy.nonMonetary.title }}
        .has-text-1 {{ copy.nonMonetary.text }}
        router-link.link.c-cta(
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
        givesMonetary,
        givesNonMonetary,
        receivesMonetary,
        receivesNonMonetary
      } = this.ourContributionSummary

      const copy = {}

      if (receivesMonetary) {
        copy.payments = {
          title: !receivesMonetary.total && L('Payments received'),
          text: !receivesMonetary.total && L('No members in the group are pledging yet! 😔'),
          ctaText: receivesMonetary.total && L('See more')
        }

        copy.monetary = {
          title: L('You need {br_}{amount}', {
            ...this.LTags(),
            amount: this.withCurrency(receivesMonetary.needed)
          }),
          text: L('You will receive {amount}.', {
            amount: this.withCurrency(receivesMonetary.total)
          })
        }
      } else if (givesMonetary) {
        const copyMonetaryTitle = (amount) => L('You are pledging {br_} {amount}', {
          ...this.LTags(),
          amount: this.withCurrency(amount)
        })

        if (givesMonetary.pledged > 0) {
          const payedAll = false // TODO - connect with real data when PaymentsSystem is done.

          copy.payments = {
            title: !givesMonetary.total && L('Payments sent'),
            text: !givesMonetary.total && L('At the moment, no one is in need of contributions.'),
            ctaText: givesMonetary.total ? (payedAll ? L('Review payments') : L('Send payments')) : null,
            ctaClass: payedAll && 'is-outlined'
          }

          copy.monetary = {
            title: copyMonetaryTitle(givesMonetary.pledged),
            text: L('{amount} will be used.', {
              amount: this.withCurrency(givesMonetary.total)
            })
          }
        } else {
          copy.payments = {
            title: L('Payments'),
            text: L('{b1}Make a pledge{b2} to start contributing to other members.', {
              b1: '<button class="link js-btnPledge">',
              b2: '</button>'
            })
          }

          copy.monetary = {
            title: copyMonetaryTitle(givesMonetary.total)
          }
        }
      }

      copy.nonMonetary = (() => {
        let text

        if (receivesNonMonetary) {
          const count = receivesNonMonetary.who.length
          text = givesNonMonetary
            ? L('You and {count} other members are contributing.', { count })
            : L('{count} members are contributing.', { count })
        } else {
          text = givesNonMonetary
            ? L('You are contributing.')
            : L('There are no non-monetary contributions.')
        }

        return { title: L('Non-monetary'), text }
      })()

      return copy
    }
  },
  methods: {
    openModal (modal) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal)
    },
    handlePaymentTextClick (e) {
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

.c-cta {
  margin-top: $spacer*1.5;
}
</style>
