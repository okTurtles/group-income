<template lang="pug">
page(
  pageTestName='payGroupPage'
  pageTestHeaderName='payGroupTitle'
)
  template(#title='') {{ L('Pay Group') }}

  template(#sidebar=''
    v-if='hasPayments'
  )
    .c-summary-item(
      v-for='(item, index) in paymentSummary'
      :key='index'
    )
      h4.title.is-4 {{item.title}}
      progress-bar.c-progress(
        :max='item.max'
        :value='item.value'
        :hasMarks='item.hasMarks'
      )
      p(:class="{'has-text-success': item.max === item.value}")
        i.icon-check(v-if="item.max === item.value")
        .has-text-1 {{item.label}}
  .c-container-empty(v-if='!hasPayments')
    svg.svg
      use(xlink:href='#svg-receive')

    i18n.title.is-4(tag='h2') There are no pending payments yet!
    i18n.has-text-1(tag='p') Once other group members add their income details, Group Income will re-distribute wealth amongst everyone.

    // TODO: Build a cleaner way of handling SVGs theme-proof
    svg.c-sprite(
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
    )
      symbol#svg-receive(xmlns="http://www.w3.org/2000/svg" viewBox="0 0 129 132")
        g(clip-path="url(#clip0)")
          path(fill="#0288D1" d="M77.698 69.022h-1.563c-4.34 0-7.899-2.803-7.899-6.363v-.582h4.34v.583c0 .97 1.52 2.049 3.56 2.049h1.562c2.04 0 3.559-1.079 3.559-2.05 0-.97-1.02-1.747-2.756-2.005l-3.754-.561a6.965 6.965 0 0 1-4.396-1.896 6.886 6.886 0 0 1-2.115-4.273c0-3.667 3.472-6.471 7.9-6.471h1.562c4.427 0 7.9 2.804 7.9 6.47v.583h-4.341v-.582c0-.97-1.52-2.05-3.559-2.05h-1.563c-2.04-.107-3.559.971-3.559 2.05 0 1.078 1.02 1.747 2.757 2.006l3.819.56a6.965 6.965 0 0 1 4.429 1.937 6.885 6.885 0 0 1 2.081 4.34c-.065 3.452-3.537 6.255-7.964 6.255z")
          path(fill="#0288D1" d="M79.086 66.866h-4.34v4.314h4.34v-4.314z")
          path(fill="#B3DBF2" d="M76.917 79.807a21.796 21.796 0 0 1-12.057-3.635 21.598 21.598 0 0 1-7.993-9.68 21.448 21.448 0 0 1-1.235-12.462 21.528 21.528 0 0 1 5.94-11.044 21.742 21.742 0 0 1 11.11-5.903 21.825 21.825 0 0 1 12.54 1.227 21.672 21.672 0 0 1 9.739 7.944 21.456 21.456 0 0 1 2.005 20.238 21.56 21.56 0 0 1-4.704 6.998 21.712 21.712 0 0 1-7.04 4.675 21.816 21.816 0 0 1-8.305 1.642zm0-38.825c-3.434 0-6.79 1.012-9.646 2.908a17.279 17.279 0 0 0-6.394 7.744 17.159 17.159 0 0 0-.988 9.97 17.223 17.223 0 0 0 4.752 8.835 17.394 17.394 0 0 0 8.889 4.723 17.46 17.46 0 0 0 10.03-.982 17.339 17.339 0 0 0 7.792-6.356 17.18 17.18 0 0 0 2.926-9.586c0-4.577-1.83-8.966-5.085-12.202a17.415 17.415 0 0 0-12.276-5.054z")
          path(fill="#0288D1" d="M79.086 45.296h-4.34v4.314h4.34v-4.314zM40.545 38.825h-1.041a5.729 5.729 0 0 1-4.099-1.438 5.66 5.66 0 0 1-1.89-3.89v-1.143h4.34v1.144c0 .474.694 1.013 1.649 1.013h1.041c.955 0 1.65-.539 1.65-1.014 0-.474-.478-.84-1.259-.97l-2.54-.41a5.567 5.567 0 0 1-3.401-1.722 5.505 5.505 0 0 1-1.48-3.498 5.659 5.659 0 0 1 1.89-3.89 5.729 5.729 0 0 1 4.099-1.438h1.041a5.729 5.729 0 0 1 4.099 1.439 5.66 5.66 0 0 1 1.89 3.89v1.142h-4.34v-1.143c0-.474-.694-1.014-1.649-1.014h-1.041c-.955 0-1.65.54-1.65 1.014 0 .475.478.841 1.259.97l2.54.41A5.568 5.568 0 0 1 45.053 30a5.505 5.505 0 0 1 1.48 3.498 5.66 5.66 0 0 1-1.89 3.889 5.729 5.729 0 0 1-4.099 1.438z")
          path(fill="#0288D1" d="M42.194 36.668h-4.34v4.314h4.34v-4.314z")
          path(fill="#B3DBF2" d="M40.024 47.453c-3.434 0-6.79-1.012-9.645-2.908a17.278 17.278 0 0 1-6.394-7.744 17.16 17.16 0 0 1-.988-9.97 17.224 17.224 0 0 1 4.751-8.835 17.394 17.394 0 0 1 8.89-4.723 17.459 17.459 0 0 1 10.03.982 17.338 17.338 0 0 1 7.791 6.356 17.182 17.182 0 0 1 2.926 9.586c0 4.577-1.829 8.966-5.085 12.202a17.415 17.415 0 0 1-12.276 5.054zm0-30.197c-2.575 0-5.093.759-7.234 2.18a12.959 12.959 0 0 0-4.795 5.809 12.869 12.869 0 0 0-.741 7.477 12.917 12.917 0 0 0 3.563 6.627 13.046 13.046 0 0 0 6.667 3.541c2.526.5 5.144.243 7.523-.736a13.003 13.003 0 0 0 5.844-4.767 12.885 12.885 0 0 0 2.194-7.19c0-3.432-1.372-6.724-3.814-9.15a13.061 13.061 0 0 0-9.207-3.791z")
          path(fill="#0288D1" d="M42.194 19.413h-4.34v4.314h4.34v-4.314zM96.969 25.883h-1.042a5.729 5.729 0 0 1-4.098-1.438 5.66 5.66 0 0 1-1.892-3.89v-1.142h4.34v1.143c0 .474.695 1.014 1.65 1.014h1.042c.955 0 1.649-.54 1.649-1.014 0-.475-.477-.841-1.259-.97l-2.539-.41a5.567 5.567 0 0 1-3.402-1.723 5.505 5.505 0 0 1-1.48-3.497 5.66 5.66 0 0 1 1.89-3.89 5.729 5.729 0 0 1 4.099-1.438h1.042a5.728 5.728 0 0 1 4.098 1.438 5.656 5.656 0 0 1 1.891 3.89v1.143h-4.34v-1.143c0-.475-.694-1.014-1.65-1.014h-1.041c-.955 0-1.65.539-1.65 1.014 0 .474.478.84 1.26.97l2.538.41a5.569 5.569 0 0 1 3.403 1.722 5.507 5.507 0 0 1 1.48 3.498 5.656 5.656 0 0 1-1.891 3.89 5.728 5.728 0 0 1-4.098 1.437z")
          path(fill="#0288D1" d="M98.618 23.726h-4.34v4.314h4.34v-4.314z")
          path(fill="#B3DBF2" d="M96.448 34.511c-3.434 0-6.79-1.012-9.646-2.908a17.279 17.279 0 0 1-6.394-7.744 17.158 17.158 0 0 1-.988-9.97 17.224 17.224 0 0 1 4.752-8.835A17.394 17.394 0 0 1 93.06.332a17.462 17.462 0 0 1 10.031.982 17.341 17.341 0 0 1 7.791 6.355 17.179 17.179 0 0 1 2.926 9.587c0 4.576-1.829 8.965-5.085 12.201a17.416 17.416 0 0 1-12.276 5.054zm0-30.197c-2.576 0-5.093.759-7.234 2.181a12.96 12.96 0 0 0-4.796 5.808 12.869 12.869 0 0 0-.74 7.477 12.917 12.917 0 0 0 3.563 6.627 13.046 13.046 0 0 0 6.666 3.542c2.526.5 5.144.243 7.524-.737a13.005 13.005 0 0 0 5.843-4.766 12.885 12.885 0 0 0 2.195-7.19c0-3.433-1.372-6.725-3.814-9.152a13.062 13.062 0 0 0-9.207-3.79z")
          path(fill="#0288D1" d="M98.618 6.47h-4.34v4.315h4.34V6.47z")
          path(fill="#BFD4C3" d="M115.979 45.296h-4.34v15.099h4.34V45.296zM115.979 36.668h-4.34v4.314h4.34v-4.314z")
          path(fill="#FFCEA8" d="M40.025 62.552h-4.34V77.65h4.34V62.552zM40.025 53.924h-4.34v4.314h4.34v-4.314z")
          path(fill="#EBB3B3" d="M107.299 66.866h-4.34V77.65h4.34V66.866z")
          path(fill="#BFD4C3" d="M70.406 8.628h-4.34V28.04h4.34V8.628z")
          path(fill="#EBB3B3" d="M35.684 0h-4.34v6.47h4.34V0z")
          path(fill="#0288D1" d="M4.775 118.108l18.296 3.543c2.772.537 5.452-1.256 5.975-3.998l.006-.027 16.415 9.124a26.183 26.183 0 0 0 7.749 2.83c3.742.725 7.626.621 11.41-.343l29.907-7.94a7.073 7.073 0 0 0 4.349-3.32 7.004 7.004 0 0 0 .68-5.408c-1.052-3.788-5.016-6.049-8.839-5.04l-17.081 4.517c-.169-3.309-2.595-6.223-6.022-6.887l-10.944-2.119-3.478-2.789a26.277 26.277 0 0 0-11.399-5.274l-8.126-1.574.024-.122c.523-2.74-1.307-5.408-4.079-5.945l-18.295-3.544c-2.773-.536-5.454 1.257-5.977 3.999l-4.65 24.371c-.523 2.742 1.306 5.409 4.08 5.946zm36.218-18.906a21.86 21.86 0 0 1 9.482 4.387l3.905 3.131c.023.019.05.028.074.045.085.064.177.118.272.169.053.029.105.061.16.085.096.041.199.069.303.097.05.013.098.037.148.047.008.002.016 0 .024.001l11.452 2.218c1.66.322 2.757 1.92 2.442 3.571-.313 1.642-1.92 2.717-3.58 2.395l-16.025-3.103c-1.18-.229-2.317.532-2.54 1.698-.222 1.167.555 2.298 1.734 2.527l16.024 3.103a7.403 7.403 0 0 0 7.215-2.654l19.79-5.232c1.513-.399 3.082.495 3.499 1.994a2.772 2.772 0 0 1-.27 2.141 2.794 2.794 0 0 1-1.721 1.314l-29.887 7.936A21.657 21.657 0 0 1 47.574 123l-17.673-9.826 2.966-15.546 8.126 1.574zM9.62 88.618a.763.763 0 0 1 .898-.6l18.295 3.543c.417.08.69.48.612.893l-4.65 24.372a.761.761 0 0 1-.897.6l-18.295-3.543a.768.768 0 0 1-.613-.893l4.65-24.372z")
        defs
          clipPath#clip0
            path(fill="#fff" d="M0 0h129v131.633H0z")

  div(v-else)
    .card
      i18n.title.is-3(
        tag='h3'
        :args='{ month: paymentStatus.month }'
      ) {month} contributions
      i18n.has-text-1(
        tag='p'
        :args='{ amount: `${fakeStore.currency}${paymentStatus.amountTotal}` }'
      ) {amount} in total

      ul.c-payments
        li.c-payments-item(
          v-for='(user, index) in fakeStore.usersToPay'
          :key='user.name'
        )
          .c-info
            avatar.c-avatar(:src='user.avatar')
            div(role="alert")
              i18n(
                tag="p"
                :args='{ total: `<b>${fakeStore.currency}${user.amount}</b>`, user: `<b>${user.name}</b>`}'
              ) {total} to {user}
              i18n.has-text-1(
                v-if='statusIsPending(user)'
                :args='{ name: getUserFirstName(user.name) }'
              ) Waiting for {name} confirmation...
              i18n.has-text-success(
                v-if='statusIsCompleted(user)'
              ) Payment confirmed!
              i18n.has-text-weight-normal.has-text-warning(
                v-if='statusIsRejected(user)'
                :args="{ name: getUserFirstName(user.name) }"
              ) The payment was not received by {name}.

          .buttons.is-start.c-ctas
            router-link.button.is-small.is-outlined(
              v-if='statusIsRejected(user)'
              to='messages/liliabt'
            ) {{ L('Send Message...') }}
            i18n.button.is-small.c-ctas-send(
              tag='button'
              key="send"
              v-if='statusIsToPay(user)'
              @click='markAsPayed(user)'
            ) Mark as sent
            i18n.button.is-small.is-outlined(
              tag='button'
              key="cancel"
              v-if='statusIsPending(user)'
              @click='cancelPayment(user)'
            ) Cancel

    .c-footer
      i18n.button.is-small.is-outlined(
        tag='button'
        @click="seeHistory"
      ) See past contributions
</template>

<script>
import sbp from '~/shared/sbp.js'
import Page from '@pages/Page.vue'
import Avatar from '@components/Avatar.vue'
import ProgressBar from '@components/Graphs/Progress.vue'
import currencies from '@view-utils/currencies.js'
import Tooltip from '@components/Tooltip.vue'
import { OPEN_MODAL } from '@utils/events.js'

export default {
  name: 'PayGroup',
  components: {
    Page,
    Avatar,
    ProgressBar,
    Tooltip
  },
  data () {
    return {
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
        currency: currencies['USD']
      }
    }
  },
  computed: {
    hasPayments () {
      return this.fakeStore.usersToPay.length > 0
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
          title: this.L('Payments sent'),
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
          title: this.L('Payments confirmed'),
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
    statusIsToPay (user) {
      return ['todo', 'rejected'].includes(user.status)
    },
    statusIsSent (user) {
      return ['completed', 'pending'].includes(user.status)
    },
    statusIsPending (user) {
      return user.status === 'pending'
    },
    statusIsRejected (user) {
      return user.status === 'rejected'
    },
    statusIsCompleted (user) {
      return user.status === 'completed'
    },
    getUserFirstName (name) {
      return name.split(' ')[0]
    },
    markAsPayed (user) {
      console.log('TODO - mark as payed')
      // Raw Logic
      user.status = 'pending'
    },
    cancelPayment (user) {
      console.log('TODO - cancel payment')
      // Raw Logic
      user.status = 'todo'
    },
    seeHistory () {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'PayGroupHistory')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

.c-container-empty {
  max-width: 25rem;
  margin: 0 auto;
  padding: $spacer-xl $spacer $spacer;
  text-align: center;

  .title {
    margin: $spacer;
  }

  .svg {
    display: inline-block;
    height: 9rem;
    margin-bottom: $spacer-lg;
  }
}

.c-summary-item {
  margin-bottom: $spacer*3;

  .icon-check {
    margin-right: $spacer-sm;
  }
}

.c-progress {
  margin: $spacer-sm 0;
}

.c-payments {
  margin-top: $spacer;
  &-item {
    padding: $spacer $spacer-sm;

    &:not(:last-child) {
      border-bottom: 1px solid $general_1;
    }

    @include tablet {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }

  .c-avatar {
    // REVIEW: without nesting it doesnt work
    min-width: 1.5rem;
    width: 1.5rem;
    margin-right: $spacer;
    margin-bottom: $spacer-sm;

    @include tablet {
      min-width: 2.5rem;
      width: 2.5rem;
    }
  }
}

.c-info {
  @include tablet {
    display: flex;
    align-items: center;
    margin-right: $spacer-sm;
  }

}

.c-ctas {
  margin-bottom: $spacer-sm;

  @include tablet {
    margin: 0;
    padding: 0;
  }
}

.c-footer {
  margin-top: $spacer-lg;
  text-align: center;
}

.c-sprite {
  display: none;
}

</style>
