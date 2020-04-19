<template lang='pug'>
// Stop initialization if group data not available
page(
  pageTestName='paymentsPage'
  pageTestHeaderName='paymentsTitle'
  v-if='ourGroupProfile'
)
  template(#title='') {{ L('Payments') }}

  template(#sidebar='' v-if='hasPayments')
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
        @click='open = false'
      )
        button.is-unstyled.tabs-link(
          v-for='(link, index) in tabItems'
          :key='index'
          :class='{ "is-active": activeTab === link.url}'
          :data-test='`link-${link.url}`'
          :aria-expanded='activeTab === link.url'
          @click='activeTab = link.url'
        )
          | {{ link.title }}
          span.tabs-notification(v-if='link.notification') {{ link.notification }}

      // Remove condition -> the search should be available for every tab if more than x result
      search(
        v-if='needsIncome || activeTab !== "todo"'
        :placeholder='L("Search payments...")'
        :label='L("Search for a payment")'
        v-model='searchText'
      )

      .tab-section
        .c-container(v-if='hasPayments')
          payments-list(
            :titles='tableTitles'
            :paymentsDistribution='paymentsDistribution'
            :paymentsType='activeTab'
          )
          .c-footer
            .c-payment-record(v-if='!needsIncome && activeTab === "todo"')
              i18n.c-payment-info(
                tag='b'
                data-test='paymentInfo'
                :args='{ total: "$110", count: "3"}'
              ) {total} in total, to {count} members

              i18n.button(
                tag='button'
                data-test='recordPayment'
                @click='openModal("RecordPayment", { paymentsDistribution })'
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
// import { PAYMENT_PENDING, PAYMENT_CANCELLED, PAYMENT_ERROR, PAYMENT_COMPLETED, PAYMENT_NOT_RECEIVED } from '@model/contracts/payments/index.js'
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
      activeTab: '',
      tabItems: [{
        title: L('Todo'),
        url: 'todo',
        index: 0,
        notification: 2
      }, {
        title: L('Sent'),
        url: 'sent',
        index: 1,
        notification: 0
      }, {
        title: L('Received'),
        url: 'received',
        index: 2,
        notification: 0
      }],
      searchText: ''
    }
  },
  created () {
    if (!this.needsIncome) this.activeTab = 'todo'
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'groupIncomeAdjustedDistribution',
      'ourGroupProfile',
      'groupSettings',
      'ourUsername',
      'thisMonthsPayments',
      'userDisplayName'
    ]),
    currency () {
      return currencies[this.groupSettings.mincomeCurrency]
    },
    needsIncome () {
      return this.ourGroupProfile.incomeDetailsType === 'incomeAmount'
    },
    tableTitles () {
      const firstTab = this.needsIncome ? L('Sent by') : L('Sent to')
      return this.activeTab === 'todo' ? {
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
    paymentsDistribution () {
      // TODO: make sure we create a new month if month roll's over
      //       perhaps send a message to do that, however make sure
      //       that there are no conflicts with timezones, to do that
      //       we need to go by the server's time, and not our time.
      //       https://github.com/okTurtles/group-income-simple/issues/531
      // TODO: Have multiple frozen distributions based on new income details
      // or new members, using any remainder leftover needed income from the
      // previous distribution
      const payments = []
      const needsIncome = this.needsIncome
      const ourUsername = this.ourUsername
      for (const p of this.groupIncomeAdjustedDistribution) {
        if (p[needsIncome ? 'to' : 'from'] === ourUsername) {
          const amount = p.amount
          const username = p[needsIncome ? 'from' : 'to']
          const displayName = this.userDisplayName(username)
          // TODO: Add filter for the tab todo / sent / received
          // TODO: move this .filter elsewhere, it shouldn't be here
          // .filter(p => {
          //   const inList = (n) => n.toUpperCase().indexOf(this.searchText.toUpperCase()) > -1
          //   return !this.searchText || inList(p.username) || (p.displayName && inList(p.displayName))
          // })
          // const { hash, data } = this.paymentFor(username)
          payments.push({
            username,
            displayName,
            // hash,
            // data,
            amount: +this.currency.displayWithoutCurrency(amount)
            // amountFormatted: this.currency.displayWithCurrency(amount),
            // paymentClass: this.paymentClass(data),
            // paymentStatusText: this.paymentStatusText(data, username)
          })
        }
      }
      return payments
    },
    hasIncomeDetails () {
      return !!this.ourGroupProfile.incomeDetailsType
    },
    hasPayments () {
      return this.paymentsDistribution.length > 0 || this.searchText !== ''
    }
  },
  methods: {
    openModal (name, props) {
      sbp('okTurtles.events/emit', OPEN_MODAL, name, props)
    },
    handleIncomeClick (e) {
      if (e.target.classList.contains('js-btnInvite')) {
        sbp('okTurtles.events/emit', OPEN_MODAL, 'IncomeDetails')
      }
    }
    // Payments
    // paymentFor (toUser) {
    //   const payments = this.thisMonthsPaymentsFrom
    //   const ourPayments = payments && payments[this.ourUsername]
    //   const paymentHash = ourPayments && ourPayments[toUser]
    //   const data = paymentHash && this.currentGroupState.payments[paymentHash].data
    //   return data ? { hash: paymentHash, data } : { data: {} }
    // },
    // paymentClass (paymentData) {
    //   return paymentData.status ? {
    //     [PAYMENT_PENDING]: 'has-text-1',
    //     [PAYMENT_CANCELLED]: '',
    //     [PAYMENT_ERROR]: 'has-text-weight-normal has-text-warning',
    //     [PAYMENT_NOT_RECEIVED]: 'has-text-weight-normal has-text-warning',
    //     [PAYMENT_COMPLETED]: 'has-text-success'
    //   }[paymentData.status] : ''
    // },
    // paymentStatusText (paymentData, username) {
    //   return paymentData.status ? {
    //     [PAYMENT_PENDING]: L('Waiting for {username} confirmation...', { username }),
    //     [PAYMENT_CANCELLED]: '',
    //     [PAYMENT_ERROR]: L('There was an error processing this payment'),
    //     [PAYMENT_NOT_RECEIVED]: L('The payment was not received by {username}.', { username }),
    //     [PAYMENT_COMPLETED]: L('Payment confirmed!')
    //   }[paymentData.status] : ''
    // },
    // showMarkAsPaid (payment) {
    //   return !payment.hash ||
    //     payment.data.status === PAYMENT_NOT_RECEIVED ||
    //     payment.data.status === PAYMENT_CANCELLED
    // },
    // async markAsPayed (toUser, payment) {
    //   try {
    //     const paymentMessage = await sbp('gi.contracts/group/payment/create', {
    //       toUser,
    //       amount: payment.amount,
    //       currency: this.currency.symbol,
    //       txid: String(Math.random()),
    //       status: PAYMENT_PENDING,
    //       paymentType: PAYMENT_TYPE_MANUAL
    //     }, this.$store.state.currentGroupId)
    //     await sbp('backend/publishLogEntry', paymentMessage)
    //   } catch (e) {
    //     console.error(e)
    //     alert(e.message)
    //   }
    // }
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
