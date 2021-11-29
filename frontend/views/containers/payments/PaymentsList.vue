<template lang='pug'>
table.table.table-in-card.c-payments(data-test='payList')
  thead
    tr
      th {{ titles.one }}
      th.c-th-amount {{ titles.two }}
      th.c-th-actions {{ titles.three }}
  tbody
    component(
      v-for='(payment, index) in paymentsList'
      :key='index'
      :payment='payment'
      :is='paymentsType'
    )
</template>

<script>
import AvatarUser from '@components/AvatarUser.vue'
import Tooltip from '@components/Tooltip.vue'
import PaymentRowTodo from './PaymentRowTodo.vue'
import PaymentRowSent from './PaymentRowSent.vue'
import PaymentRowReceived from './PaymentRowReceived.vue'

export default ({
  name: 'PaymentsList',
  components: {
    AvatarUser,
    Tooltip,
    PaymentRowTodo,
    PaymentRowSent,
    PaymentRowReceived
  },
  props: {
    titles: {
      type: Object,
      required: true
    },
    paymentsList: {
      type: Array,
      required: true
    },
    paymentsType: {
      type: String,
      validator: (value) => ['PaymentRowTodo', 'PaymentRowSent', 'PaymentRowReceived'].includes(value),
      required: true
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-payments {
  margin-top: 1rem;

  th,
  td {
    &:first-child {
      width: 41%;
    }

    &:last-child {
      width: 5%;

      @include tablet {
        width: 20%;
      }
    }
  }
}

.c-th-amount {
  @include phone {
    text-align: right;
  }
}

.c-th-actions {
  @include phone {
    opacity: 0;
  }
}
</style>
