<template lang='pug'>
// Stop initialization if group data not available
page(
  pageTestName='paymentsPage'
  pageTestHeaderName='paymentsTitle'
  :data-test-date='humanDate(Date.now())'
  v-if='ourGroupProfile'
)
  template(#title='') {{ L('Payments') }}

  template(#sidebar='' v-if='showTabSelectionMenu || paymentsListData.length > 0')
    month-overview

  add-income-details-widget(v-if='!hasIncomeDetails')

  template(v-else)
    p.p-description
      span.has-text-1(v-safe-html='introTitle')
      | &nbsp;
      i18n.has-text-1(
        @click='handleAnchorClick'
        :args='{ \
          r1: `<button class="link js-btnInvite" data-test="openIncomeDetailsModal">`, \
          r2: "</button>" \
        }'
      ) You can change this at any time by updating your {r1}income details{r2}.

      i18n.has-text-1(
        @click='handleAnchorClick'
        tag='div'
        :args='{ \
          r1: `<button class="link js-btnSimulator">`, \
          r2: "</button>" \
        }'
      ) Try out the {r1}payments simulator.{r2}

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
        v-if='showTabSelectionMenu'
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
          next-distribution-pill

      .c-chip-container-below-tabs.hide-tablet
        next-distribution-pill.c-distribution-pill

      .c-filters(v-if='paymentsListData.length > 0')
        .c-method-filters
          button.is-small.c-payment-method-filter-opt(
            v-for='(name, method) in config.paymentMethodFilterOptions'
            type='button'
            :key='method'
            :disabled='method === "lightning" && ephemeral.activeTab !== "PaymentRowTodo"'
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
            :selectedTodoItems.sync='ephemeral.selectedTodoItems'
          )

          .c-footer
            .c-payment-record(v-if='ephemeral.activeTab === "PaymentRowTodo"')
              .c-payment-info-wrapper
                b.c-payment-info(data-test='paymentInfo') {{ footerTodoStatus }}
                .c-distribution-locked-warning-wrapper(v-if='distributionLocked')
                  span.pill.is-warning {{ config.paymentLockedWarningOptions.title }}
                  tooltip(
                    :text='config.paymentLockedWarningOptions.tooltip'
                    :isTextCenter='true'
                  )
                    i.icon-info-circle.has-text-warning

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

            .c-export-csv-container
              i18n.is-outlined.is-small.c-export-csv-btn(
                v-if='showExportPaymentsButton'
                tag='button'
                type='button'
                @click='openExportPaymentsModal'
              ) Export CSV

        .c-container(v-else-if='ephemeral.activeTab === "PaymentRowTodo" && ephemeral.paymentMethodFilter === "lightning"')
          p.c-lightning-todo-msg Coming Soon.

          .c-footer
            .c-payment-record.c-lightning-temp(v-if='isDevEnv')
              button.is-success.is-outlined.is-small(
                type='button'
                @click='openLightningPayments'
              ) Open Placeholder Modal

              button.is-outlined.is-small(
                type='button'
                @click='openLightningPaymentDetail'
              ) Open Placeholder Detail Modal

        .c-container-noresults(v-else-if='paymentsListData.length && !paymentsFiltered.length' data-test='noResults')
          i18n(tag='p' :args='{query: form.searchText }') No results for "{query}".

        .c-container-empty.no-payments(v-else data-test='noPayments')
          svg-contributions.c-svg
          i18n.c-description(tag='p') There are no payments.
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import Page from '@components/Page.vue'
import Search from '@components/Search.vue'
import Tooltip from '@components/Tooltip.vue'
import { OPEN_MODAL } from '@utils/events.js'
import SvgContributions from '@svgs/contributions.svg'
import PaymentsList from '@containers/payments/PaymentsList.vue'
import NextDistributionPill from '@containers/payments/PaymentNextDistributionPill.vue'
import PaymentsPagination from '@containers/payments/PaymentsPagination.vue'
import MonthOverview from '@containers/payments/MonthOverview.vue'
import AddIncomeDetailsWidget from '@containers/contributions/AddIncomeDetailsWidget.vue'
import PaymentsMixin from '@containers/payments/PaymentsMixin.js'
import { PAYMENT_NOT_RECEIVED, PAYMENT_COMPLETED } from '@model/contracts/shared/payments/index.js'
import { dateToMonthstamp, dateFromPeriodStamp, humanDate } from '@model/contracts/shared/time.js'
import { randomHexString, deepEqualJSONType, omit, uniq } from 'turtledash'
import { L, LTags } from '@common/common.js'
import {
  dummyLightningUsers,
  dummyLightningTodoItems,
  dummyLightningPaymentDetails
} from '@view-utils/lightning-dummy-data.js'
import { logExceptNavigationDuplicated, withGroupCurrency } from '@view-utils/misc.js'

export default ({
  name: 'Payments',
  mixins: [PaymentsMixin],
  components: {
    Page,
    SvgContributions,
    Search,
    Tooltip,
    PaymentsList,
    PaymentsPagination,
    NextDistributionPill,
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
        // TODO: maybe externalize the option names as contants, (e.g. PAYMENTS_METHOD.MANUAL, PAYMENTS_METHOD.LIGHTNING)
        //       once the payment method is implemented in the 'gi.contracts/group'
        paymentMethodFilterOptions: {
          'all': L('ALL'),
          'lightning': L('Lightning'),
          'manual': L('Manual')
        },
        paymentLockedWarningOptions: {
          title: L('Distribution Locked'),
          tooltip: L('First payment sent. Distribution is now locked.')
        }
      },
      historicalPayments: {
        received: [],
        sent: [],
        todo: []
      }
    }
  },
  created () {
    this.updatePayments()
  },
  watch: {
    ourPayments (to, from) {
      if (!deepEqualJSONType(to, from)) {
        this.updatePayments()
      }
    },
    '$route': {
      immediate: true,
      handler (to, from) {
        const section = to.query.section
        if (section && this.tabSections.includes(section)) {
          this.ephemeral.activeTab = section
        } else {
          const fromQuery = from?.query || {}
          const isFromTableRelatedModals = [
            'PaymentDetail',
            'ExportPaymentsModal'
          ].includes(fromQuery.modal)
          const defaultTab = isFromTableRelatedModals
            // When payment detail modal is closed, the payment table has to remain in the previously active tab.
            // (context: https://github.com/okTurtles/group-income/issues/1686)
            ? fromQuery.section || this.tabSections[0]
            : this.tabSections[0]

          if (defaultTab) {
            this.handleTabClick(defaultTab)
          } else if (section) {
            const query = omit(this.$route.query, ['section'])
            this.$router.push({ query }).catch(logExceptNavigationDuplicated)
          }
        }
      }
    }
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'thisPeriodPaymentInfo',
      'ourGroupProfile',
      'groupSettings',
      'userDisplayNameFromID'
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
    distributionLocked () {
      if (!this.thisPeriodPaymentInfo) {
        return false
      }
      const { paymentsFrom } = this.thisPeriodPaymentInfo
      const { payments } = this.currentGroupState

      for (const fromMemberID of Object.keys(paymentsFrom)) {
        for (const toMemberID of Object.keys(paymentsFrom[fromMemberID])) {
          for (const hash of paymentsFrom[fromMemberID][toMemberID]) {
            if (payments[hash].data.status === PAYMENT_COMPLETED) {
              return true
            }
          }
        }
      }
      return false
    },
    tabItems () {
      const items = []

      if (!this.distributionStarted) {
        return items
      }

      if (!this.needsIncome) {
        items.push({
          title: L('Todo'),
          url: 'PaymentRowTodo',
          notification: this.paymentsTodo.length
        })
      }

      const doesNotNeedIncomeAndDidReceiveBefore = !this.needsIncome && this.paymentsReceived.length

      if (this.needsIncome || doesNotNeedIncomeAndDidReceiveBefore) {
        items.push({
          title: L('Received'),
          url: 'PaymentRowReceived'
        })
      }

      if (!this.needsIncome || this.paymentsSent.length) {
        items.push({
          title: L('Completed'),
          url: 'PaymentRowSent'
        })
      }

      return items
    },
    tableTitles () {
      const { activeTab } = this.ephemeral

      return activeTab === 'PaymentRowTodo'
        ? {
            one: L('Sent to'),
            two: L('Amount'),
            three: L('Accepted methods'),
            four: L('Due on')
          }
        : {
            one: activeTab === 'PaymentRowSent' ? L('Sent to') : L('Sent by'),
            two: L('Amount'),
            three: L('Payment method'),
            four: L('Payment date')
          }
    },
    tabSections () {
      return this.tabItems.map(tabItem => tabItem.url)
    },
    introTitle () {
      return this.needsIncome
        ? L('You are currently {strong_}receiving{_strong} mincome.', LTags('strong'))
        : L('You are currently {strong_}sending{_strong} mincome.', LTags('strong'))
    },
    // paymentsCount () {
    //   if (Object.keys(this.groupSettings).length) {
    //     return this.paymentHashesForPeriod(await this.historicalPeriodStampGivenDate(this.groupSettings.distributionDate))?.length
    //   }
    // },
    paymentsTodo () {
      const payments = []
      const sentPayments = this.paymentsSent

      for (const payment of this.historicalPayments.todo) {
        payments.push({
          hash: payment.hash || randomHexString(15),
          toMemberID: payment.toMemberID,
          displayName: this.userDisplayNameFromID(payment.toMemberID),
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
      return this.historicalPayments.sent.map(payment => ({
        ...payment,
        toMemberID: payment.data.toMemberID,
        displayName: this.userDisplayNameFromID(payment.data.toMemberID),
        monthstamp: dateToMonthstamp(payment.meta.createdDate),
        date: payment.meta.createdDate
      })).sort(this.sortPaymentByDescendingPeriod)
    },
    paymentsReceived () {
      return this.historicalPayments.received.map(payment => ({
        ...payment,
        fromMemberID: payment.data.fromMemberID,
        displayName: this.userDisplayNameFromID(payment.data.fromMemberID),
        date: payment.meta.createdDate
      })).sort(this.sortPaymentByDescendingPeriod)
    },
    paymentsListData () {
      return {
        PaymentRowTodo: () => this.paymentsTodo,
        PaymentRowSent: () => this.paymentsSent,
        PaymentRowReceived: () => this.paymentsReceived
      }[this.ephemeral.activeTab]?.() || []
    },
    hasIncomeDetails () {
      return !!this.ourGroupProfile?.incomeDetailsType
    },
    paymentsFiltered () {
      return this.paymentsListData.filter(this.filterPayment)
    },
    footerTodoStatus () {
      const amount = this.paymentsTodo.reduce((total, p) => total + p.amount, 0)
      const memberIds = uniq(this.paymentsTodo.map(item => item.toMemberID))
      const membersLen = memberIds.length

      return membersLen === 1
        ? L('{amt} in total, to 1 member', { amt: this.withGroupCurrency(amount) })
        : L('{amt} in total, to {count} members', { amt: this.withGroupCurrency(amount), count: membersLen })
    },
    showTabSelectionMenu () {
      return this.tabItems.length > 0
    },
    showExportPaymentsButton () {
      return ['PaymentRowSent', 'PaymentRowReceived'].includes(this.ephemeral.activeTab) &&
        this.paymentsListData.length > 0
    },
    isDevEnv () {
      return process.env.NODE_ENV === 'development'
    }
  },
  methods: {
    humanDate,
    withGroupCurrency,
    prettyDate (date) {
      return humanDate(date, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })
    },
    openModal (name, props) {
      sbp('okTurtles.events/emit', OPEN_MODAL, name, null, props)
    },
    filterPayment (payment) {
      const {
        amount, displayName,
        // NOTE: 'accepted payment method' is not implemented yet, so 'acceptedMethods' just a dummy field for now.
        // TODO: update the field name & the related logic (e.g. 'matchesMethodFilter' below) accordingly
        //       once 'accepted payment method' is implemented in the contract.
        acceptedMethods = ['manual']
      } = payment
      const methodFilterVal = this.ephemeral.paymentMethodFilter
      const searchQuery = this.form.searchText

      const matchesMethodFilter = methodFilterVal === 'all' || acceptedMethods.includes(methodFilterVal)
      const matchesSearchQuery = searchQuery === '' ||
        `${amount}${displayName.toUpperCase()}`.indexOf(searchQuery.toUpperCase()) !== -1

      return matchesMethodFilter && matchesSearchQuery
    },
    sortPaymentByDescendingPeriod (a, b) {
      return dateFromPeriodStamp(b.period) - dateFromPeriodStamp(a.period)
    },
    paginateList (list) {
      const start = this.ephemeral.rowsPerPage * this.ephemeral.currentPage
      return list.slice(start, start + this.ephemeral.rowsPerPage)
    },
    handleTabClick (url) {
      const query = {
        ...this.$route.query,
        section: url
      }
      this.$router.push({ query }).catch(logExceptNavigationDuplicated)
    },
    handleAnchorClick ({ target }) {
      const contains = className => target.classList.contains(className)

      if (contains('js-btnInvite')) {
        sbp('okTurtles.events/emit', OPEN_MODAL, 'IncomeDetails')
      } else if (contains('js-btnSimulator')) {
        window.open(
          'https://groupincome.org/simulator/',
          '_blank'
        )
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
      this.openModal('RecordPayment', { todoItems: this.ephemeral.selectedTodoItems })
    },
    async openLightningPayments () {
      const wait = (milli) => new Promise(resolve => setTimeout(resolve, milli))
      let contractID

      // check if the fake users have been created and sign them up if not.
      // TODO: to be removed once lightning network is implemented
      for (const userData of dummyLightningUsers) {
        contractID = await sbp('namespace/lookup', userData.username)

        if (!contractID) {
          console.log(`signing up a fake user [${userData.username}]`)
          await sbp('gi.app/identity/signup', userData)
        }
      }

      if (!contractID) {
        // if fake users have just been created,
        // wait a little bit for the avatar image to be prepared
        await wait(100)
      }

      this.openModal('SendPaymentsViaLightning', { todoItems: dummyLightningTodoItems })
    },
    openLightningPaymentDetail () {
      this.openModal('PaymentDetail', {
        lightningPayment: dummyLightningPaymentDetails
      })
    },
    async updatePayments () {
      // NOTE: no need to calculate while logging out
      if (Object.keys(this.groupSettings).length) {
        this.historicalPayments = await this.getAllPaymentsInTypes()
      }
    },
    openExportPaymentsModal () {
      const modalTypeMap = {
        'PaymentRowSent': 'sent',
        'PaymentRowReceived': 'received'
      }

      sbp('okTurtles.events/emit', OPEN_MODAL, 'ExportPaymentsModal',
        { type: modalTypeMap[this.ephemeral.activeTab] }, // query params
        { data: this.paymentsListData }
      )
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

  > div {
    margin-top: 0.25rem;
  }

  @include desktop {
    margin-top: -1rem;
    padding-bottom: 1.5rem;
  }
}

// Tabs
.tabs {
  flex-wrap: wrap;
  margin-bottom: 1.5rem;

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

.c-chip-container-below-tabs {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  margin-bottom: 1.25rem;

  @include tablet {
    margin-bottom: 2.5rem;
  }
}

.c-below-tabs-chip-container {
  margin-bottom: 1.5rem;
}

// Search
.c-filters {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.5rem;
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
  position: relative;
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

    &.c-lightning-temp {
      flex-direction: column;
      justify-content: flex-start;
      align-items: flex-start;
      gap: 1rem;
    }

    .c-payment-info-wrapper {
      @include phone {
        margin-bottom: 1.5rem;
      }

      .c-distribution-locked-warning-wrapper {
        display: flex;
        gap: 0.25rem;
        width: fit-content;

        .pill {
          height: fit-content;
          margin: auto;
          text-transform: uppercase;
        }
      }
    }
  }

  @include phone {
    .c-pagination {
      justify-content: center;
    }

    .c-payment-record {
      flex-direction: column;
      justify-content: flex-start;
      align-items: stretch;

      .c-payment-info {
        margin-bottom: 2rem;
      }

      .button {
        width: 100%;
      }
    }
  }
}

.c-lightning-todo-msg {
  margin-top: 2rem;
}

.c-export-csv-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.c-export-csv-btn {
  margin-top: 0.75rem;

  @include tablet {
    position: absolute;
    bottom: 0;
    right: 11.75rem;
    margin-top: 0;
  }

  @media screen and (min-width: $desktop) and (max-width: 1310px) {
    position: relative;
    bottom: unset;
    right: unset;
    margin-top: 0.75rem;
  }
}
</style>
