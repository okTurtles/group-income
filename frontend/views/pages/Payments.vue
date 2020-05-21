<template lang='pug'>
// Stop initialization if group data not available
page(
  pageTestName='paymentsPage'
  pageTestHeaderName='paymentsTitle'
  v-if='ourGroupProfile'
)
  template(#title='') {{ L('Payments') }}

  template(#sidebar='' v-if='hasIncomeDetails')
    month-overview

  add-income-details-widget(v-if='!hasIncomeDetails')

  template(v-else)
    p.p-description
      span.has-text-1(v-html='introTitle')
      | &nbsp;
      i18n.has-text-1(
        @click='handleIncomeClick'
        :args='{ \
          r1: `<button class="link js-btnInvite" data-test="openIncomeDetailsModal">`, \
          r2: "</button>" \
        }'
      ) You can change this at any time by updating your {r1}income details{r2}.

    section(v-if='needsIncome && !hasPayments')
      .c-container-empty
        svg-contributions.c-svg
        i18n.c-description(tag='p') You haven’t received any payments yet

    section.card(v-else)
      nav.tabs(
        v-if='!needsIncome'
        :aria-label='L("Payments type")'
      )
        button.is-unstyled.tabs-link(
          v-for='(link, index) in tabItems'
          :key='index'
          :class='{ "is-active": ephemeral.activeTab === link.url}'
          :data-test='`link-${link.url}`'
          :aria-expanded='ephemeral.activeTab === link.url'
          @click='ephemeral.activeTab = link.url'
        )
          | {{ link.title }}
          span.tabs-notification(v-if='link.notification') {{ link.notification }}

      // Remove condition -> the search should be available for every tab if more than x result
      search(
        v-if='needsIncome || ephemeral.activeTab !== "PaymentRowTodo"'
        :placeholder='L("Search payments...")'
        :label='L("Search for a payment")'
        v-model='ephemeral.searchText'
      )

      .tab-section
        .c-container(v-if='hasPayments')
          payments-list(
            :titles='tableTitles'
            :paymentsList='paymentsListData'
            :paymentsType='ephemeral.activeTab'
          )
          .c-footer
            .c-payment-record(v-if='!needsIncome && ephemeral.activeTab === "PaymentRowTodo"')
              i18n.c-payment-info(
                tag='b'
                data-test='paymentInfo'
                :args='tableFooterStatus'
              ) {amount} in total, to {count} members

              i18n.button(
                tag='button'
                data-test='recordPayment'
                @click='openModal("RecordPayment", { paymentsList: paymentsTodo })'
              ) Record payments
            payments-pagination(v-else)

        .c-container-empty(v-else)
          svg-contributions.c-svg
          i18n.c-description(tag='p') There are no pending payments.
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import Page from '@components/Page.vue'
import Search from '@components/Search.vue'
import currencies from '@view-utils/currencies.js'
import { OPEN_MODAL } from '@utils/events.js'
import SvgContributions from '@svgs/contributions.svg'
import PaymentsList from '@containers/payments/PaymentsList.vue'
import PaymentsPagination from '@containers/payments/PaymentsPagination.vue'
import MonthOverview from '@containers/payments/MonthOverview.vue'
import AddIncomeDetailsWidget from '@containers/contributions/AddIncomeDetailsWidget.vue'
import { PAYMENT_NOT_RECEIVED } from '@model/contracts/payments/index.js'
import { currentMonthstamp, dateFromMonthstamp, lastDayOfMonth, prevMonthstamp } from '~/frontend/utils/time.js'
import L, { LTags } from '@view-utils/translations.js'

export default {
  name: 'Payments',
  components: {
    Page,
    SvgContributions,
    Search,
    PaymentsList,
    PaymentsPagination,
    MonthOverview,
    AddIncomeDetailsWidget
  },
  data () {
    return {
      ephemeral: {
        activeTab: 'PaymentRowReceived',
        searchText: ''
      }
    }
  },
  created () {
    if (!this.needsIncome) this.ephemeral.activeTab = 'PaymentRowTodo'
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'groupIncomeDistribution',
      'groupIncomeAdjustedDistribution',
      'paymentTotalFromUserToUser',
      'ourPayments',
      'groupMonthlyPayments',
      'ourGroupProfile',
      'groupSettings',
      'ourUsername',
      'userDisplayName'
    ]),
    currency () {
      return currencies[this.groupSettings.mincomeCurrency]
    },
    needsIncome () {
      return this.ourGroupProfile.incomeDetailsType === 'incomeAmount'
    },
    tabItems () {
      const items = [{
        title: L('Todo'),
        url: 'PaymentRowTodo',
        notification: this.paymentsTodo.length
      }, {
        title: L('Sent'),
        url: 'PaymentRowSent',
        notification: this.paymentsSent.length
      }]
      if (this.paymentsReceived.length > 0) {
        items.push({
          title: L('Received'),
          url: 'PaymentRowReceived',
          notification: this.paymentsReceived.length
        })
      }
      return items
    },
    tableTitles () {
      const firstTab = this.needsIncome ? L('Sent by') : L('Send to')
      return this.ephemeral.activeTab === 'PaymentRowTodo' ? {
        one: firstTab,
        two: L('Amount'),
        three: L('Due in')
      } : {
        one: firstTab,
        two: L('Amount'),
        three: L('Date')
      }
    },
    introTitle () {
      return this.needsIncome
        ? L('You are currently {strong_}receiving{_strong} mincome.', LTags('strong'))
        : L('You are currently {strong_}sending{_strong} mincome.', LTags('strong'))
    },
    paymentsLate () {
      const monthlyPayments = this.groupMonthlyPayments
      const currentDistribution = this.groupIncomeAdjustedDistribution
      const { pledgeAmount } = this.ourGroupProfile
      const cMonthstamp = currentMonthstamp()
      const pMonthstamp = prevMonthstamp(cMonthstamp)
      const latePayments = []
      const pastMonth = monthlyPayments[pMonthstamp]
      // QUESTION: Is this only from the previous month? What if there are payments from 2-3 months ago?
      if (pastMonth) {
        const pDate = dateFromMonthstamp(pMonthstamp)
        const dueIn = lastDayOfMonth(pDate)

        for (const payment of pastMonth.lastAdjustedDistribution) {
          if (payment.from === this.ourUsername && payment.amount > 0) {
            // Let A = the amount we owe from the previous distribution.
            // Let B = the total we've sent to payment.to from the current
            //         month's paymentsFrom.
            // Let C = the total amount we "owe" to payment.to from the
            //         current month's distribution.
            // Let D = the amount we're pledging this month
            // Let E = the amount still unpaid for the previous month's distribution,
            //         calculated as: C > 0 ? A : A + D - B
            //
            // If E > 0, then display a row for the late payment.
            const A = payment.amount
            const B = this.paymentTotalFromUserToUser(this.ourUsername, payment.to, cMonthstamp)
            var C = currentDistribution
              .filter(a => a.from === payment.from && a.to === payment.to)
            C = C.length > 0 ? C[0].amount : 0
            const D = pledgeAmount
            const E = C > 0 ? A : A + D - B
            if (E > 0) {
              latePayments.push({
                username: payment.to,
                displayName: this.userDisplayName(payment.to),
                amount: payment.amount, // TODO: include currency (what if it was changed?)
                // partiaL: TODO add this info as it is in this.paymentsTodo
                isLate: true,
                date: dueIn
              })
            }
          }
        }
      }
      return latePayments
    },
    paymentsTodo () {
      const payments = []
      const sentPayments = this.paymentsSent
      const cMonthstamp = currentMonthstamp()
      const pDate = dateFromMonthstamp(cMonthstamp)
      const dueIn = lastDayOfMonth(pDate)

      for (const payment of this.ourPayments.todo) {
        payments.push({
          hash: payment.hash,
          username: payment.to,
          displayName: this.userDisplayName(payment.to),
          amount: payment.amount,
          total: payment.total,
          partial: payment.partial,
          isLate: false,
          date: dueIn
        })
      }

      const notReceived = sentPayments.filter(p => p.data.status === PAYMENT_NOT_RECEIVED)
      return this.paymentsLate.concat(notReceived, payments)
    },
    paymentsSent () {
      const cMonthstamp = currentMonthstamp()
      const payments = []

      for (const payment of this.ourPayments.sent) {
        const { hash, data, meta } = payment
        const p = {
          hash,
          data,
          meta,
          username: data.toUser,
          displayName: this.userDisplayName(data.toUser),
          date: meta.createdDate,
          monthstamp: cMonthstamp,
          amount: data.amount // TODO: properly display and convert in the correct currency using data.currencyFromTo and data.exchangeRate,
        }

        if (this.filterPayment(p)) {
          payments.push(p)
        }
      }

      // TODO: implement better / more correct sorting
      return payments.sort((a, b) => a.date < b.date)
    },
    paymentsToBeReceived () {
      const payments = []
      for (const payment of this.ourPayments.toBeReceived) {
        payments.push({
          hash: payment.hash,
          username: payment.from,
          amount: payment.amount,
          total: payment.total,
          partial: payment.partial
        })
      }
      return payments
    },
    paymentsReceived () {
      const payments = []

      for (const payment of this.ourPayments.received) {
        const { hash, data, meta } = payment
        const fromUser = meta.username
        const p = {
          hash,
          data,
          meta,
          username: fromUser,
          displayName: this.userDisplayName(fromUser),
          date: meta.createdDate,
          amount: data.amount // TODO: properly display and convert in the correct currency using data.currencyFromTo and data.exchangeRate
        }
        if (this.filterPayment(p)) {
          payments.push(p)
        }
      }
      // TODO: implement better / more correct sorting
      return payments.sort((a, b) => a.date < b.date)
    },
    paymentsListData () {
      return {
        PaymentRowTodo: () => this.paymentsTodo,
        PaymentRowSent: () => this.paymentsSent,
        PaymentRowReceived: () => this.paymentsReceived
      }[this.ephemeral.activeTab]()
    },
    paymentsAllData () {
      return {
        todo: this.paymentsTodo,
        sent: this.paymentsSent,
        toBeReceived: this.paymentsToBeReceived,
        received: this.paymentsReceived
      }
    },
    hasIncomeDetails () {
      return !!this.ourGroupProfile.incomeDetailsType
    },
    hasPayments () {
      return this.paymentsListData.length > 0 || this.ephemeral.searchText !== ''
    },
    tableFooterStatus () {
      const amount = this.paymentsTodo.reduce((total, p) => total + p.amount, 0)
      return {
        amount: this.currency.displayWithCurrency(amount),
        count: this.paymentsTodo.length
      }
    }
  },
  methods: {
    openModal (name, props) {
      sbp('okTurtles.events/emit', OPEN_MODAL, name, props)
    },
    filterPayment (payment) {
      const query = this.ephemeral.searchText
      const { amount, username, displayName } = payment
      return query === '' || `${amount}${username.toUpperCase()}${displayName.toUpperCase()}`.indexOf(query.toUpperCase()) !== -1
    },
    handleIncomeClick (e) {
      if (e.target.classList.contains('js-btnInvite')) {
        sbp('okTurtles.events/emit', OPEN_MODAL, 'IncomeDetails')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

// Header
.p-description {
  margin-top: -1.5rem;
  padding-bottom: 1rem;

  @include desktop {
    margin-top: -1rem;
    padding-bottom: 1.5rem;
  }
}

// Search
.tabs + .c-search-form {
  margin-top: 1.5rem;
}

// Empty
.c-container-empty {
  max-width: 25rem;
  margin: 0 auto;
  text-align: center;
  padding-top: 2.5rem;

  @include desktop {
    padding-top: 4rem;
  }

  .c-description {
    margin: 1.5rem 0 0 0;
    color: $text_1;
  }

  .c-svg {
    display: inline-block;
    width: 8.25rem;
    height: 8.25rem;
    margin-left: -0.5rem;
    filter: contrast(0%) brightness(172%);
  }
}

.card .c-container-empty {
  padding-top: 2rem;

  @include desktop {
    padding-top: 2.5rem;
  }
  .c-svg {
    filter: contrast(0%) brightness(186%);
  }
}

.is-dark-theme {
  .card .c-container-empty .c-svg {
    opacity: 0.5;
  }
}

// Footer
.c-footer {
  padding-top: 1.5rem;

  @include tablet {
    padding-top: 1.5rem;
  }

  @include desktop {
    padding-top: 1.5rem;
  }

  .c-pagination,
  .c-payment-record {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  @include phone {
    .c-payment-info {
      display: none;
    }

    .c-payment-record .button {
      width: 100%;
    }
  }
}
</style>
