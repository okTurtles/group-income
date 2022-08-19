<template lang='pug'>
table.table.table-in-card.c-payments(data-test='payList' :class='tableClass')
  thead
    tr
      th.c-th-check-all(v-if='paymentsType === "PaymentRowTodo"')
        label.checkbox
          input.input(type='checkbox' v-model='form.checkAll')
          span
            i18n.sr-only Select payment item
      th.c-th-who {{ titles.one }}
      th.c-th-amount {{ titles.two }}
      th.c-th-method {{ titles.three }}
      th.c-th-date {{ titles.four }}
      th.c-th-actions(v-if='paymentsType !== "PaymentRowTodo"')
        | {{ L('Relative to') }}
        i.sort-down.c-action-arrow
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
  },
  data () {
    return {
      form: {
        checkAll: false
      }
    }
  },
  computed: {
    tableClass () {
      const map = {
        'PaymentRowTodo': 'todo',
        'PaymentRowSent': 'sent',
        'PaymentRowReceived': 'received'
      }

      return `c-is-${map[this.paymentsType]}`
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

  &.c-is-todo {
    th,
    td {
      &:first-child {
        width: 1.125rem;
      }

      &:nth-child(2) {
        width: 30%;
      }

      &:nth-child(4) {
        width: 27%;

        @include phone {
          display: none;
        }
      }
    }

    th {
      .checkbox {
        margin-right: 0.2rem;
      }
    }
  }
}

.c-th-amount {
  @include phone {
    text-align: right;
  }
}

.c-th-date {
  @include phone {
    display: none;
  }
}

.c-th-actions {
  @include phone {
    opacity: 0;
  }
}
</style>
