<template lang='pug'>
// Stop initialization if group data not available
page(
  pageTestName='paymentsPage'
  pageTestHeaderName='paymentsTitle'
  :data-test-date='humanDate(Date.now())'
  v-if='ourGroupProfile'
)
  template(#title='') {{ L('Payments') }}

  template(#sidebar='' v-if='tabItems.length > 0 || paymentsListData.length > 0')
    month-overview

  add-income-details-widget(v-if='!hasIncomeDetails')

  template(v-else)
    p.p-description
      span.has-text-1(v-safe-html='introTitle')
      | &nbsp;
      i18n.has-text-1(
        @click='handleIncomeClick'
        :args='{ \
          r1: `<button class="link js-btnInvite" data-test="openIncomeDetailsModal">`, \
          r2: "</button>" \
        }'
      ) You can change this at any time by updating your {r1}income details{r2}.

    section(v-if='!distributionStarted')
      .c-container-empty
        svg-contributions.c-svg
        i18n.c-description(
          tag='p'
          :args='{ startDate: distributionStart }'
        ) The distribution period begins on: {startDate}

    section(v-else-if='tabItems.length === 0 && paymentsListData.length === 0')
      .c-container-empty
        svg-contributions.c-svg
        i18n.c-description(tag='p') You haven’t received any payments yet

    section.card(v-else)
      nav.tabs(
        v-if='tabItems.length > 0'
        :aria-label='L("Payments type")'
        data-test='payNav'
      )
        button.is-unstyled.tabs-link(
          v-for='(link, index) in tabItems'
          :key='index'
          :class='{ "is-active": ephemeral.activeTab === link.url}'
          :data-test='`link-${link.url}`'
          :aria-expanded='ephemeral.activeTab === link.url'
          @click='handleTabClick(link.url)'
        )
          | {{ link.title }}
          span.tabs-notification(v-if='link.notification') {{ link.notification }}

      search(
        v-if='paymentsListData.length && ephemeral.activeTab !== "PaymentRowTodo"'
        :placeholder='L("Search payments...")'
        :label='L("Search for a payment")'
        v-model='form.searchText'
      )

      .tab-section
        .c-container(v-if='paymentsFiltered.length')
          payments-list(
            :titles='tableTitles'
            :paymentsList='paginateList(paymentsFiltered)'
            :paymentsType='ephemeral.activeTab'
          )
          .c-footer
            .c-payment-record(v-if='ephemeral.activeTab === "PaymentRowTodo"')
              i18n.c-payment-info(
                tag='b'
                data-test='paymentInfo'
                :args='footerTodoStatus'
              ) {amount} in total, to {count} members

              i18n.button(
                tag='button'
                data-test='recordPayment'
                @click='openModal("RecordPayment")'
              ) Record payments
            payments-pagination(
              v-else
              :count='paymentsFiltered.length'
              :rowsPerPage='ephemeral.rowsPerPage'
              :page.sync='ephemeral.currentPage'
              @change-page='handlePageChange'
              @change-rows-per-page='handleRowsPerPageChange'
            )
        .c-container-noresults(v-else-if='paymentsListData.length && !paymentsFiltered.length' data-test='noResults')
          i18n(tag='p' :args='{query: form.searchText }') No results for "{query}".
        .c-container-empty(v-else data-test='noPayments')
          svg-contributions.c-svg
          i18n.c-description(tag='p') There are no payments.
          i18n.c-description(
            tag='p'
            :args='{ ...LTags(), date: nextDistribution }'
          ) Next distribution period: {date}
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import Page from '@components/Page.vue'
import Search from '@components/Search.vue'
import { OPEN_MODAL } from '@utils/events.js'
import SvgContributions from '@svgs/contributions.svg'
import PaymentsList from '@containers/payments/PaymentsList.vue'
import PaymentsPagination from '@containers/payments/PaymentsPagination.vue'
import MonthOverview from '@containers/payments/MonthOverview.vue'
import AddIncomeDetailsWidget from '@containers/contributions/AddIncomeDetailsWidget.vue'
import { PAYMENT_NOT_RECEIVED } from '@model/contracts/payments/index.js'
import L, { LTags } from '@view-utils/translations.js'
import { dateToMonthstamp, humanDate } from '@utils/time.js'

export default ({
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
      form: {
        searchText: ''
      },
      ephemeral: {
        activeTab: '',
        rowsPerPage: 10,
        currentPage: 0
      }
    }
  },
  created () {
    this.setInitialActiveTab()
  },
  watch: {
    needsIncome () {
      this.setInitialActiveTab()
    }
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'groupIncomeDistribution',
      'groupIncomeAdjustedDistribution',
      'paymentTotalFromUserToUser',
      'ourPayments',
      'ourGroupProfile',
      'groupSettings',
      'ourUsername',
      'userDisplayName',
      'periodAfterPeriod',
      'withGroupCurrency'
    ]),
    needsIncome () {
      return this.ourGroupProfile.incomeDetailsType === 'incomeAmount'
    },
    distributionStart () {
      return this.prettyDate(this.groupSettings.distributionDate)
    },
    distributionStarted () {
      return Date.now() >= new Date(this.groupSettings.distributionDate).getTime()
    },
    nextDistribution () {
      const currentPeriod = this.groupSettings.distributionDate
      return this.prettyDate(this.periodAfterPeriod(currentPeriod))
    },
    tabItems () {
      const items = []

      if (!this.needsIncome) {
        items.push({
          title: L('Todo'),
          url: 'PaymentRowTodo',
          notification: this.paymentsTodo.length
        })
      }

      const doesNotNeedIncomeAndDidReceiveBefore = !this.needsIncome && this.paymentsReceived.length
      const doesNeedIncomeAndDidSentBefore = this.needsIncome && this.paymentsSent.length

      if (doesNotNeedIncomeAndDidReceiveBefore || doesNeedIncomeAndDidSentBefore) {
        items.push({
          title: L('Received'),
          url: 'PaymentRowReceived'
        })
      }

      if (!this.needsIncome || this.paymentsSent.length) {
        items.push({
          title: L('Sent'),
          url: 'PaymentRowSent'
        })
      }

      return items
    },
    tableTitles () {
      const firstTab = this.needsIncome ? L('Sent by') : L('Sent to')
      return this.ephemeral.activeTab === 'PaymentRowTodo'
        ? {
            one: firstTab,
            two: L('Amount'),
            three: L('Due in')
          }
        : {
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
    paymentsTodo () {
      const payments = []
      const sentPayments = this.paymentsSent

      for (const payment of this.ourPayments.todo) {
        payments.push({
          hash: payment.hash,
          username: payment.to,
          displayName: this.userDisplayName(payment.to),
          amount: payment.amount,
          total: payment.total,
          partial: payment.partial,
          isLate: payment.isLate,
          date: payment.dueOn
        })
      }

      const notReceived = sentPayments.filter(p => p.data.status === PAYMENT_NOT_RECEIVED)
      return [notReceived, payments].flat()
    },
    paymentsSent () {
      const payments = []

      for (const payment of this.ourPayments.sent) {
        const { hash, data, meta } = payment
        payments.push({
          hash,
          data,
          meta,
          username: data.toUser,
          displayName: this.userDisplayName(data.toUser),
          date: meta.createdDate,
          monthstamp: dateToMonthstamp(meta.createdDate),
          amount: data.amount // TODO: properly display and convert in the correct currency using data.currencyFromTo and data.exchangeRate,
        })
      }

      // TODO: implement better / more correct sorting
      return payments.sort((a, b) => a.date < b.date)
    },
    paymentsReceived () {
      const payments = []

      for (const payment of this.ourPayments.received) {
        const { hash, data, meta } = payment
        const fromUser = meta.username
        payments.push({
          hash,
          data,
          meta,
          username: fromUser,
          displayName: this.userDisplayName(fromUser),
          date: meta.createdDate,
          amount: data.amount // TODO: properly display and convert in the correct currency using data.currencyFromTo and data.exchangeRate
        })
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
    hasIncomeDetails () {
      return !!this.ourGroupProfile.incomeDetailsType
    },
    paymentsFiltered () {
      return this.paymentsListData.filter(this.filterPayment)
    },
    footerTodoStatus () {
      const amount = this.paymentsTodo.reduce((total, p) => total + p.amount, 0)
      return {
        amount: this.withGroupCurrency(amount),
        count: this.paymentsTodo.length
      }
    }
  },
  methods: {
    humanDate,
    prettyDate (date) {
      return humanDate(date, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })
    },
    setInitialActiveTab () {
      this.ephemeral.activeTab = this.needsIncome ? 'PaymentRowReceived' : 'PaymentRowTodo'
    },
    openModal (name, props) {
      sbp('okTurtles.events/emit', OPEN_MODAL, name, props)
    },
    filterPayment (payment) {
      const query = this.form.searchText
      const { amount, username, displayName } = payment
      return query === '' || `${amount}${username.toUpperCase()}${displayName.toUpperCase()}`.indexOf(query.toUpperCase()) !== -1
    },
    paginateList (list) {
      const start = this.ephemeral.rowsPerPage * this.ephemeral.currentPage
      return list.slice(start, start + this.ephemeral.rowsPerPage)
    },
    handleTabClick (url) {
      this.ephemeral.activeTab = url
    },
    handleIncomeClick (e) {
      if (e.target.classList.contains('js-btnInvite')) {
        sbp('okTurtles.events/emit', OPEN_MODAL, 'IncomeDetails')
      }
    },
    handlePageChange (type) {
      const current = this.ephemeral.currentPage
      this.ephemeral.currentPage = type === 'next' ? current + 1 : current - 1
    },
    handleRowsPerPageChange (value) {
      this.ephemeral.rowsPerPage = value
      this.ephemeral.currentPage = 0 // go back to first page.
    }
  }
}: Object)
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

.c-container-noresults {
  padding-top: 1.5rem;
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
