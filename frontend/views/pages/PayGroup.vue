<template lang='pug'>
page(
  pageTestName='payGroupPage'
  pageTestHeaderName='payGroupTitle'
)
  template(#title='') {{ L('Payments') }}

  template(#sidebar='' v-if='hasPayments')
    i18n.c-summary-title.is-title-4(
      tag='h4'
      data-test='thisMonth'
      :args='{ month: thisMonth() }'
    ) {month} overview

    .c-summary-item(
      v-for='(item, index) in paymentSummary'
      :key='index'
    )
      h5.label {{ item.title }}

      progress-bar.c-progress(
        :max='item.max'
        :value='item.value'
        :hasMarks='item.hasMarks'
      )
      p(:class='{"has-text-success": item.max === item.value}')
        i.icon-check(v-if='item.max === item.value')
        .has-text-1 {{ item.label }}

  i18n.p-descritpion.has-text-1(
    tag='p'
    data-test='openIncomeDetailsModal'
    @click='openModal("IncomeDetails")'
    :args='{ receive_or_send: `<strong>${needsIncome ? L("receiving") : L("sending")}</strong>`, r1: `<button class="link js-btnInvite">`, r2: "</button>"}'
  ) You are currently {receive_or_send} mincome. You can change this at any time by updating your {r1}income details{r2}.

  section.card
    nav.tabs(
      v-if='!needsIncome'
      aria-label='payments type'
      @click='open = false'
    )
      button.is-unstyled.tabs-link(
        v-for='(link, index) in tabItems'
        :key='index'
        :class='{ "tabs-link-active": activeTab === link.url}'
        :data-test='`link-${link}`'
        :aria-expanded='activeTab === link.url'
        @click='activeTab = link.url'
      )
        | {{ link.title }}
        span.tabs-notification(v-if='link.notification') {{ link.notification }}

    form.c-search-form(
      v-if='needsIncome || activeTab !== "todo"'
      @submit.prevent='submit'
    )
      label.field
        .input-combo
          .is-icon(:aria-label='L("Search")')
            i.icon-search
          input.input(
            type='text'
            name='search'
            data-test='search'
            placeholder='Search payments...'
            v-model='form.search'
          )
          button.is-icon-small(
            v-if='form.search'
            :aria-label='L("Clear search")'
            @click='form.search = null'
          )
            i.icon-times

    .tab-section
      .c-container(v-if='hasPayments')
        table.table.table-in-card.c-payments
          thead
            tr
              th {{ tableTitles.one }}
              th.c-payments-amount {{ tableTitles.two }}
              th.c-payments-date {{ tableTitles.three }}

          tbody
            tr(
              v-for='(payment, index) in paymentsDistribution'
              :key='index'
            )
              td
                .c-user
                  avatar-user.c-avatar(:username='payment.to' size='xs')
                  strong.c-name {{payment.to}}
                .c-user-month(:class='index === 0 ? "has-text-1" : "c-status-danger c-status"') {{ randomMonth() }}
              td.c-payments-amount
                .c-payments-amount-info(v-if='index === 0 && (!needsIncome && activeTab === "todo")')
                  i18n.c-partial-info.has-text-1(
                    tag='span'
                    :args='{partial_amount: `<strong class="has-text-0">$20</strong>`, partial_total: payment.amountFormatted}'
                  ) {partial_amount} out of {partial_total}

                  span.c-status.c-status-primary Partial
                  //- i18n.c-status.c-status-primary(
                  //-   tag='span'
                  //-   role='alert'
                  //-   v-if='payment.hash'
                  //-   :class='payment.paymentClass'
                  //- ) {{ payment.paymentStatusText }}

                strong(v-else) {{payment.amountFormatted}}
                .c-payments-amount-info(
                  v-if='index === 0 && (needsIncome || activeTab === "received")'
                  :class='"c-status-warning"'
                )
                  tooltip.c-name-tooltip(
                    v-if=''
                    direction='top'
                    :isTextCenter='true'
                    :text='payment.to + L(" marked this payment as not received.")'
                  )
                    .button.is-icon-smaller.c-tip
                      i.icon-info

                  span.c-status Not received

              td
                .c-actions
                  .c-actions-month(:class='!(index !== 0 && activeTab === "todo") ? "has-text-1" : "c-status-danger c-status"') {{ randomMonth() }}
                  menu-parent
                    menu-trigger.is-icon-small(:aria-label='L("Show payment menu")')
                      i.icon-ellipsis-v

                    menu-content.c-actions-content
                      ul
                        menu-item(
                          v-if='activeTab === "sent" || needsIncome'
                          tag='button'
                          item-id='message'
                          icon='info'
                          @click='openModal("PaymentDetail")'
                        )
                          i18n Payment details

                        menu-item(
                          v-if='activeTab === "todo"'
                          tag='button'
                          item-id='message'
                          icon='times'
                          @click='cancelPayment(payment.to, payment.hash)'
                        )
                          i18n Dismiss this payment

                        menu-item(
                          v-if='activeTab === "sent"'
                          tag='button'
                          item-id='message'
                          icon='times'
                          @click='cancelPayment(payment.to, payment.hash)'
                        )
                          i18n Cancel this payment

                        menu-item(
                          v-if='needsIncome'
                          tag='button'
                          item-id='message'
                          icon='times'
                          @click='cancelPayment(payment.to, payment.hash)'
                        )
                          i18n I did not receive this

        .c-footer
          .c-payment-record(v-if='!needsIncome && activeTab === "todo"')
            i18n.c-payment-info(
              tag='b'
              data-test='paymentInfo'
              :args='{ total: "$110", count: "3"}'
            ) {total} in total, to {count} members

            i18n.button(
              tag='button'
              data-test='recorPayment'
            ) Record payments
          .c-pagination(v-else)
            .c-pagination-settings
              i18n.has-text-1(
                tag='span'
              ) Show:
              .select-wrapper.combobox
                select.button.is-small.is-outlined(
                  ref='select'
                  @change='updatePagination'
                )
                  option(
                    v-for='numberPerPage in [10, 20, 30]'
                    :index='numberPerPage'
                    :value='numberPerPage'
                  ) {{ `${numberPerPage} ${L('results')}` }}
              i18n.has-text-1(
                tag='span'
              ) per page

            .c-pagination-controls
              i18n.has-text-1(
                tag='p'
                data-test='paginationInfo'
                :args='{ currentPage: `<span class="has-text-0">1 — 5</span>`, maxPages: `<span class="has-text-0">5</span>`}'
              ) {currentPage} out of {maxPages}

              .c-previous-next
                button.c-control.is-unstyled(
                  @click='previousPage'
                  :aria-label='L("Previous page")'
                )
                  i.icon-chevron-left

                button.c-control.is-unstyled(
                  @click='nextPage'
                  :aria-label='L("Next page")'
                )
                  i.icon-chevron-right

      .c-container-empty(v-else)
        svg-contributions.c-svg
        i18n.c-title.is-title-4(tag='h2') There are no pending payments.
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import Page from '@components/Page.vue'
import AvatarUser from '@components/AvatarUser.vue'
import ProgressBar from '@components/graphs/Progress.vue'
import currencies from '@view-utils/currencies.js'
import Tooltip from '@components/Tooltip.vue'
import { OPEN_MODAL } from '@utils/events.js'
import SvgContributions from '@svgs/contributions.svg'
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/menu/index.js'
import { PAYMENT_TYPE_MANUAL, PAYMENT_PENDING, PAYMENT_CANCELLED, PAYMENT_ERROR, PAYMENT_COMPLETED, PAYMENT_NOT_RECEIVED } from '@model/contracts/payments/index.js'
import L from '@view-utils/translations.js'

export default {
  name: 'PayGroup',
  components: {
    Page,
    AvatarUser,
    ProgressBar,
    Tooltip,
    SvgContributions,
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem
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
      monthsNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      form: {
        search: null
      },
      fakeStore: {
        usersToPay: [
          {
            name: 'Lilia Bouvet',
            avatar: '/assets/images/default-avatar.png',
            status: 'todo',
            amount: 10
          },
          {
            name: 'Charlotte Doherty',
            avatar: '/assets/images/default-avatar.png',
            status: 'todo',
            amount: 20
          },
          {
            name: 'Kim Kr',
            avatar: '/assets/images/default-avatar.png',
            status: 'rejected',
            amount: 25
          },
          {
            name: 'Zoe Kim',
            avatar: '/assets/images/default-avatar.png',
            status: 'pending',
            amount: 30
          },
          {
            name: 'Hugo Lil',
            avatar: '/assets/images/default-avatar.png',
            status: 'completed',
            amount: 50
          }
        ],
        currency: currencies.USD.symbol
      }
    }
  },
  created () {
    if (!this.needsIncome) this.activeTab = 'todo'
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'groupIncomeDistribution',
      'groupProfiles',
      'ourGroupProfile',
      'groupSettings',
      'ourUsername',
      'thisMonthsPayments'
    ]),
    currency () {
      return currencies[this.groupSettings.mincomeCurrency]
    },
    needsIncome () {
      return this.ourGroupProfile.incomeDetailsType === 'incomeAmount'
    },
    tableTitles () {
      return this.activeTab === 'todo' ? {
        one: L('Send to'),
        two: L('Amount'),
        three: L('Due in')
      } : {
        one: L('Sent to'),
        two: L('Amount'),
        three: L('Date')
      }
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
      const distribution = this.thisMonthsPayments.frozenDistribution || this.groupIncomeDistribution
      return distribution.filter(p => p[this.needsIncome ? 'to' : 'from'] === this.ourUsername).map(transfer => {
        const { to, amount } = transfer
        const { hash, data } = this.paymentFor(to)
        return {
          to,
          hash,
          data,
          amount: +this.currency.displayWithoutCurrency(amount),
          amountFormatted: this.currency.displayWithCurrency(amount),
          paymentClass: this.paymentClass(data),
          paymentStatusText: this.paymentStatusText(data, to)
        }
      })
    },
    paymentTotal () {
      return this.currency.displayWithCurrency(
        this.paymentsDistribution.reduce((acc, p) => acc + p.amount, 0)
      )
    },
    statusType () {
      return { PAYMENT_PENDING, PAYMENT_CANCELLED, PAYMENT_ERROR, PAYMENT_COMPLETED, PAYMENT_NOT_RECEIVED }
    },
    // old stuff (to be deleted) follows
    hasPayments () {
      return this.paymentsDistribution.length > 0
    },
    paymentStatus () {
      const { usersToPay } = this.fakeStore

      return {
        month: 'July',
        paymentsTotal: usersToPay.length,
        sent: usersToPay.reduce((acc, user) => this.statusIsSent(user) ? acc + 1 : acc, 0),
        confirmed: usersToPay.reduce((acc, user) => this.statusIsCompleted(user) ? acc + 1 : acc, 0),
        amoutSent: usersToPay.reduce((acc, user) => this.statusIsSent(user) ? acc + user.amount : acc, 0),
        amountTotal: usersToPay.reduce((acc, user) => acc + user.amount, 0)
      }
    },
    paymentSummary () {
      const { currency } = this.fakeStore
      const { sent, confirmed, amoutSent, amountTotal, paymentsTotal } = this.paymentStatus

      return [
        {
          title: this.L('Payments completed'),
          value: sent,
          max: paymentsTotal,
          hasMarks: true,
          label: this.L('{value} out of {max}', {
            value: sent,
            max: paymentsTotal
          })
        },
        {
          title: this.L('Amout sent'),
          value: amoutSent,
          max: amountTotal,
          hasMarks: false,
          label: this.L('{value} of {max}', {
            value: `${currency}${amoutSent}`,
            max: `${currency}${amountTotal}`
          })
        },
        {
          title: this.L('Payments received'),
          value: confirmed,
          max: paymentsTotal,
          hasMarks: true,
          label: this.L('{value} of {max}', {
            value: confirmed,
            max: paymentsTotal
          })
        }
      ]
    }
  },
  methods: {
    // TEMP
    randomMonth () {
      return this.monthsNames[new Date(+(new Date()) - Math.floor(Math.random() * 10000000000)).getMonth()]
    },
    updatePagination () {
      console.log('Todo: implement update pagination settings')
    },
    previousPage () {
      console.log('Todo: implement previous page functionality')
    },
    nextPage () {
      console.log('Todo: implement next page functionality')
    },
    // END TEMP
    thisMonth () {
      return this.monthsNames[new Date().getMonth()]
    },
    openModal (name) {
      sbp('okTurtles.events/emit', OPEN_MODAL, name)
    },
    paymentFor (toUser) {
      const payments = this.thisMonthsPayments.payments
      const ourPayments = payments && payments[this.ourUsername]
      const paymentHash = ourPayments && ourPayments[toUser]
      const data = paymentHash && this.currentGroupState.payments[paymentHash].data
      return data ? { hash: paymentHash, data } : { data: {} }
    },
    paymentClass (paymentData) {
      return paymentData.status ? {
        [PAYMENT_PENDING]: 'has-text-1',
        [PAYMENT_CANCELLED]: '',
        [PAYMENT_ERROR]: 'has-text-weight-normal has-text-warning',
        [PAYMENT_NOT_RECEIVED]: 'has-text-weight-normal has-text-warning',
        [PAYMENT_COMPLETED]: 'has-text-success'
      }[paymentData.status] : ''
    },
    paymentStatusText (paymentData, username) {
      return paymentData.status ? {
        [PAYMENT_PENDING]: L('Waiting for {username} confirmation...', { username }),
        [PAYMENT_CANCELLED]: '',
        [PAYMENT_ERROR]: L('There was an error processing this payment'),
        [PAYMENT_NOT_RECEIVED]: L('The payment was not received by {username}.', { username }),
        [PAYMENT_COMPLETED]: L('Payment confirmed!')
      }[paymentData.status] : ''
    },
    showMarkAsPaid (payment) {
      return !payment.hash ||
        payment.data.status === PAYMENT_NOT_RECEIVED ||
        payment.data.status === PAYMENT_CANCELLED
    },
    statusIsSent (user) {
      return ['completed', 'pending'].includes(user.status)
    },
    statusIsCompleted (user) {
      return user.status === 'completed'
    },
    async markAsPayed (toUser, payment) {
      try {
        const paymentMessage = await sbp('gi.contracts/group/payment/create', {
          toUser,
          amount: payment.amount,
          currency: this.currency.symbol,
          txid: String(Math.random()),
          status: PAYMENT_PENDING,
          paymentType: PAYMENT_TYPE_MANUAL
        }, this.$store.state.currentGroupId)
        await sbp('backend/publishLogEntry', paymentMessage)
      } catch (e) {
        console.error(e)
        alert(e.message)
      }
    },
    // TODO: make multiple payments
    async cancelPayment (username, paymentHash) {
      try {
        const paymentMessage = await sbp('gi.contracts/group/paymentUpdate/create', {
          paymentHash,
          updatedProperties: {
            status: PAYMENT_CANCELLED
          }
        }, this.$store.state.currentGroupId)
        await sbp('backend/publishLogEntry', paymentMessage)
      } catch (e) {
        console.error(e)
        alert(e.message)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.p-descritpion {
  margin-top: -1.5rem;
  padding-bottom: $spacer;

  @include desktop {
    margin-top: -$spacer;
    padding-bottom: 1.5rem;
  }
}

.c-container-empty {
  max-width: 25rem;
  margin: 0 auto;
  padding-top: 2rem;
  text-align: center;

  @include desktop {
    padding-top: 2.5rem;
  }

  .c-title {
    margin: 1.5rem 0 0 0;
    color: $text_1;
  }

  .c-svg {
    display: inline-block;
    width: 8.25rem;
    height: 8.25rem;
    margin-left: -$spacer-sm;
    filter: contrast(0%) brightness(186%);
  }
}

.c-summary-item {
  margin-bottom: $spacer*3;

  .label {
    margin-bottom: $spacer-xs;
  }

  .icon-check {
    margin-right: $spacer-sm;
  }
}

.c-summary-title {
  margin-bottom: 1.75rem;
  margin-top: -0.25rem;
}

.c-progress {
  margin: $spacer-xs 0;
}

.c-payments {
  margin-top: $spacer;

  th, td {
    &:first-child {
      width: 41%;
    }

    &:last-child {
      width: 10%;
      padding-left: $spacer;

      @include tablet {
        width: 22%;
      }
    }
  }

  &-date {
    @include phone {
      display: none;
    }
  }

  &-amount {
    @include phone {
      text-align: right;
    }
  }
}

.c-actions,
.c-user {
  display: flex;
  align-items: center;
}

.c-avatar {
  margin-right: $spacer-sm;
}

.c-avatar,
.c-actions-month {
  @include phone {
    display: none;
  }
}

.c-name {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.c-actions {
  justify-content: space-between;
}

.c-user-month {
  display: none;
  @include phone {
    display: inline-block;
  }
}

.c-status {
  border-radius: 3px;
  padding: 0 $spacer-xs;
  text-transform: uppercase;
  font-size: $size_5;
}

.c-payments-amount-info {
  display: inline-flex;
  align-items: center;
}

.c-status-primary {
  &.c-status,
  .c-status{
    background: $primary_2;
    color: $primary_0;
  }

  .c-tip {
    background: $primary_0;
  }
}

.c-status-danger {
  &.c-status,
  .c-status{
    background: $danger_2;
    color: $danger_0;
  }

  .c-tip {
    background: $danger_0;
  }
}

.c-status-warning {
  &.c-status,
  .c-status {
    background: $warning_2;
    color: $warning_0;
  }
  .c-tip {
    background: $warning_0;
  }
}

.c-tip {
  width: 0.875rem;
  height: 0.875rem;
  border-radius: 50%;
  margin-left: $spacer-sm;
  margin-right: $spacer-xs;
  font-size: 0.5rem;

  &,
  &:hover {
    color: #fff;
  }
}

.c-partial-info {
  @include phone {
    display: block;
  }
}

.has-text-1 + .c-status {
  margin-left: $spacer-sm;
}

.c-content {
  width: 13.375rem;
  left: -12rem;
  top: 2rem;
}

.c-ctas {
  margin-bottom: $spacer-sm;

  @include tablet {
    margin: 0;
    padding: 0;
  }
}

.c-footer {
  padding-top: 1.5rem;

  @include tablet {
    padding-top: 1.5rem;
  }

  @include desktop {
    padding-top: 1.5rem;
  }

  > div {
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

.c-pagination-settings,
.c-pagination-controls,
.c-previous-next {
  display: flex;
  align-items: center;
}

.c-control,
.select-wrapper {
  margin: 0 $spacer-xs;
}

.c-control {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 50%;
  color: $general_0;
  background-color: $general_2;

  &:first-child i {
    margin-left: -1px;
  }

  &:last-child i {
    margin-right: -1px;
  }

  &::hover {
    color: $text_0;
    background-color: $general_0;
  }
}

.c-sprite {
  display: none;
}

.tabs + .c-search-form {
  margin-top: 1.5rem;
}

.input-combo {
  align-items: center;

  .is-icon {
    left: 0;
    right: auto;
  }

  .is-icon-small {
    position: absolute;
    right: $spacer-sm;
    background: $general_2;
    border-radius: 50%;

    &:hover {
      background: $general_1;
    }
  }
}

</style>
