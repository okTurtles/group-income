<template lang='pug'>
  page-section(:title='L("Contributions")')
    .c-widget(data-test='contributionsWidget')
      .c-column
        .c-status(v-if='!distributionStarted')
          h3.is-title-4.c-title(data-test='paymentsTitle') {{ pSummary.title }}
          i18n.has-text-1(
            tag='p'
            data-test='paymentsStatus'
            :args='{ startDate: distributionStart }'
          ) The distribution period begins on: {startDate}
        template(v-else)
          .c-status(v-if='copy.payments.title')
            h3.is-title-4.c-title(data-test='paymentsTitle') {{ copy.payments.title }}
            .has-text-1(
              data-test='paymentsStatus'
              v-safe-html='copy.payments.status'
              @click='handlePaymentStatusClick'
            )
          .c-status(v-else data-test='paymentsSummary')
            .c-pSummary
              h3.is-title-4 {{ pSummary.title }}
              p.c-pSummary-status(:class='{"has-text-success": pSummary.max === pSummary.value}')
                i.icon-check.is-prefix(v-if='pSummary.max === pSummary.value')
                span.has-text-1 {{ pSummary.label }}
            progress-bar.c-progress(
              :max='pSummary.max'
              :value='pSummary.value'
              :hasMarks='pSummary.hasMarks'
            )

          router-link.button.is-small(
            v-if='copy.payments.ctaText'
            to='/payments'
            :class='copy.payments.ctaClass'
          ) {{ copy.payments.ctaText }}

      .c-column
        h3.is-title-4.c-title(v-safe-html='copy.monetary.title' data-test='monetaryTitle')
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
import sbp from '@sbp/sbp'
import { L, LTags } from '@common/common.js'
import { mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import PageSection from '@components/PageSection.vue'
import ProgressBar from '@components/graphs/Progress.vue'
import currencies from '@model/contracts/shared/currencies.js'
import { humanDate } from '@model/contracts/shared/time.js'

export default ({
  name: 'ContributionsWidget',
  components: {
    PageSection,
    ProgressBar
  },
  computed: {
    ...mapGetters([
      'groupSettings',
      'currentGroupState',
      'groupProfiles',
      'currentIdentityState',
      'ourGroupProfile',
      'ourContributionSummary',
      'ourPaymentsSummary'
    ]),
    distributionStart () {
      return humanDate(
        this.groupSettings.distributionDate,
        { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }
      )
    },
    distributionStarted () {
      return Date.now() >= new Date(this.groupSettings.distributionDate).getTime()
    },
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
            ...LTags(),
            amount: this.withCurrency(receivingMonetary.needed)
          }),
          status: L('You will receive {amount}.', {
            amount: this.withCurrency(receivingMonetary.total)
          })
        }
      } else if (givingMonetary) {
        const copyMonetaryTitle = (amount) => L('You are pledging {br_}{amount}', {
          ...LTags(),
          amount: this.withCurrency(amount)
        })

        if (givingMonetary.pledged > 0) {
          const payedAll = this.ourPaymentsSummary.paymentsTotal === this.ourPaymentsSummary.paymentsDone

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
          const isSingularCount = count === 1
          status = givingNonMonetary
            ? isSingularCount
              ? L('You and 1 other member are contributing.')
              : L('You and {count} other members are contributing.', { count })
            : isSingularCount
              ? L('1 member is contributing.')
              : L('{count} members are contributing.', { count })
        } else {
          status = givingNonMonetary
            ? L('You are contributing.')
            : L('There are no non-monetary contributions.')
        }

        return { title: L('Non-monetary'), status }
      })()

      return copy
    },
    pSummary () {
      const { paymentsTotal, paymentsDone, hasPartials } = this.ourPaymentsSummary

      return {
        title: this.ourGroupProfile.incomeDetailsType === 'incomeAmount' ? L('Payments received') : L('Payments sent'),
        value: paymentsDone,
        max: paymentsTotal,
        hasMarks: true,
        hasPartials,
        label: L('{value} out of {max}', {
          value: paymentsDone,
          max: paymentsTotal
        })
      }
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
}: Object)
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-widget {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    "payments payments"
    "monetary nonMonetary";
  grid-column-gap: 1.5rem;
  grid-row-gap: 1.5rem;

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
  margin-bottom: 0.5rem;
}

.c-status {
  margin-bottom: 1.5rem;
}

.c-pSummary {
  display: flex;
  margin-bottom: 1rem;

  &-status {
    margin-left: 0.5rem;
  }
}
</style>
