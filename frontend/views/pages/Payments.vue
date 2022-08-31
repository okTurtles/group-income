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
      )
        .c-tabs-link-container(data-test='payNav')
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

        .c-tabs-chip-container.hide-phone
          i18n.c-distribution-chip.pill.is-primary(
            :args='{ startDate: distributionDateShort }'
          ) Next distribution Date: {startDate}

      .c-below-tabs-chip-container.hide-tablet
        i18n.c-distribution-chip.pill.is-primary(
          :args='{ startDate: distributionDateShort }'
        ) Next distribution Date: {startDate}

      h3.is-title-3.c-tab-header(v-if='tabHeader') {{ tabHeader }}

      .c-filters(v-if='paymentsListData.length > 0')
        .c-method-filters
          button.is-small.c-payment-method-filter-opt(
            v-for='(name, method) in config.paymentMethodFilterOptions'
            type='button'
            :key='method'
            :class='{ "is-active":  ephemeral.paymentMethodFilter === method }'
            @click='ephemeral.paymentMethodFilter = method'
          ) {{ name }}

        search.c-search-input(
          v-if='paymentsListData.length'
          :placeholder='L("Search payments...")'
          :label='L("Search for a payment")'
          v-model='form.searchText'
        )

      .tab-section
        .c-container(v-if='paymentsFiltered.length')
          payments-list(
            ref='paymentList'
            :titles='tableTitles'
            :paymentsList='paginateList(paymentsFiltered)'
            :paymentsType='ephemeral.activeTab'
            @todo-items-change='onTodoItemsChange'
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
                :disabled='!ephemeral.selectedTodoItems || ephemeral.selectedTodoItems.length === 0'
                @click='onRecordPaymentClick'
              ) Send payments

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
          .c-lightning-btn-container(v-if='ephemeral.paymentMethodFilter === "lightning"')
            button(@click='openLightningPayments') Open Lightning Modal

        .c-container-empty.no-payments(v-else data-test='noPayments')
          svg-contributions.c-svg
          i18n.c-description(tag='p') There are no payments.
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
import { PAYMENT_NOT_RECEIVED } from '@model/contracts/shared/payments/index.js'
import { dateToMonthstamp, humanDate } from '@model/contracts/shared/time.js'
import { randomHexString } from '@model/contracts/shared/giLodash.js'
import { L, LTags } from '@common/common.js'

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
        currentPage: 0,
        paymentMethodFilter: 'all', // defaults to 'all' options
        enableSendPaymentBtn: false,
        selectedTodoItems: null
      },
      config: {
        paymentMethodFilterOptions: {
          'all': L('ALL'),
          'lightning': L('Lightning'),
          'manual': L('Manual')
        }
        // TODO: maybe externalize the option names as contants, (e.g. PAYMENTS_METHOD.MANUAL, PAYMENTS_METHOD.LIGHTNING)
        //       once the payment method is implemented in the 'gi.contracts/group'
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
      return this.ourGroupProfile?.incomeDetailsType === 'incomeAmount'
    },
    distributionStart () {
      return this.prettyDate(this.groupSettings.distributionDate)
    },
    distributionStarted () {
      return Date.now() >= new Date(this.groupSettings.distributionDate).getTime()
    },
    distributionDateShort () {
      return humanDate(this.groupSettings.distributionDate, { month: 'short', day: 'numeric' })
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
            three: L('Accepted methods'),
            four: L('Due in')
          }
        : {
            one: firstTab,
            two: L('Amount'),
            three: L('Payment method'),
            four: L('Payment date')
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
          hash: payment.hash || randomHexString(15),
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
    tabHeader () {
      return {
        PaymentRowSent: L('Completed payments'),
        PaymentRowReceived: L('Received payments')
      }[this.ephemeral.activeTab] || ''
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
      const {
        amount, username, displayName,
        // NOTE: 'accepted payment method' is not implemented yet, so 'acceptedMethods' just a dummy field for now.
        // TODO: update the field name & the related logic (e.g. 'matchesMethodFilter' below) accordingly
        //       once 'accepted payment method' is implemented in the contract.
        acceptedMethods = ['manual']
      } = payment
      const methodFilterVal = this.ephemeral.paymentMethodFilter
      const searchQuery = this.form.searchText

      const matchesMethodFilter = methodFilterVal === 'all' || acceptedMethods.includes(methodFilterVal)
      const matchesSearchQuery = searchQuery === '' ||
        `${amount}${username.toUpperCase()}${displayName.toUpperCase()}`.indexOf(searchQuery.toUpperCase()) !== -1

      return matchesMethodFilter && matchesSearchQuery
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
    },
    onRecordPaymentClick () {
      this.$store.commit('addPaymentsToRecord', this.ephemeral.selectedTodoItems)
      this.openModal('RecordPayment')
    },
    onTodoItemsChange (selectedTodos) {
      this.ephemeral.selectedTodoItems = selectedTodos
    },
    async openLightningPayments () {
      const fakeUsers = [
        {
          username: 'fake-user-1',
          email: 'fake1@abc.com',
          password: '123456789'
        },
        {
          username: 'fake-user-2',
          email: 'fake2@def.com',
          password: '123456789'
        }
      ]
      const wait = (milli) => new Promise(resolve => setTimeout(resolve, milli))

      // check if the fake users have been created and sign them up if not.
      // TODO: to be removed once lightning network is implemented
      for (const userData of fakeUsers) {
        const contractID = await sbp('namespace/lookup', userData.username)

        if (!contractID) {
          console.log(`signing up a fake user [${userData.username}]`)
          await sbp('gi.actions/identity/signup', userData)
        }
      }

      await wait(100) // wait a little bit for the avatar image to be prepared

      this.openModal('SendPaymentsViaLightning')
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

// Tabs
.tabs {
  flex-wrap: wrap;
  margin-bottom: 2rem;

  .c-tabs-link-container {
    display: flex;
    flex-direction: row;
    flex-grow: 1;
  }

  .c-tabs-chip-container {
    align-self: center;
    height: max-content;
    padding: 0 1.5rem 0 0;
    margin: 0.75rem 0;
  }
}

.c-below-tabs-chip-container {
  margin-bottom: 1.5rem;
}

.c-distribution-chip {
  padding: 0.25rem 0.75rem;
  border-radius: 1.6rem;
}

// Search
.c-filters {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
  width: 100%;

  @include tablet {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .c-method-filters {
    display: inline-flex;
    gap: 0.5rem;
    width: max-content;
  }

  .c-search-input {
    order: -1;

    @include tablet {
      order: unset;
      max-width: 12.125rem;
    }
  }
}

.c-payment-method-filter-opt {
  text-transform: uppercase;
  color: $text_0;
  background-color: $general_2;

  &.is-active {
    color: $primary_0;
    border: 1px solid $primary_0;
  }

  &:hover,
  &.is-active {
    background-color: $primary_2;
  }

  &[disabled] {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.c-search-input {
  ::v-deep .inputgroup .input {
    padding-right: 2.75rem;

    &:placeholder-shown {
      // if the text input element is empty.
      padding-right: 1.375rem;
    }
  }
}

.c-container-empty {
  max-width: 25rem;
  margin: 0 auto;
  text-align: center;
  padding-top: 2.5rem;

  &.no-payments {
    max-width: unset;
  }

  @include desktop {
    &:not(.no-payments) {
      padding-top: 4rem;
    }
  }

  .c-description {
    margin: 1rem 0 0 0;
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

.c-lightning-btn-container {
  margin-top: 1.5rem;
}
</style>
