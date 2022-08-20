<template lang='pug'>
table.table.table-in-card.c-payments(data-test='payList' :class='tableClass')
  thead
    tr
      th.c-th-check-all(v-if='paymentsType === "PaymentRowTodo"')
        label.checkbox
          input.input(
            type='checkbox'
            v-model='form.checkAll'
          )
          span
            i18n.sr-only Select payment item
      th.c-th-who {{ titles.one }}
      th.c-th-amount {{ titles.two }}
      th.c-th-method {{ titles.three }}
      th.c-th-date {{ titles.four }}
      th.c-th-relative-to(v-if='paymentsType !== "PaymentRowTodo"')
        | {{ L('Relative to') }}
        i.icon-sort-down.c-action-arrow
  tbody
    component(
      v-for='(payment, index) in paymentsList'
      ref='paymentItem'
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
  },
  watch: {
    'form.checkAll' (val) {
      const method = val ? 'select' : 'deselect'

      this.$refs.paymentItem.forEach(c => c[method]())
    }
  },
  methods: {
    getAllSelectedTodoItems () {
      return this.paymentsType === 'PaymentRowTodo'
        ? this.$refs.paymentItem.filter(c => c.form.checked)
            .map(c => this.paymentsList.find(p => p.hash === c.hash))
        : null
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-payments {
  margin-top: 1rem;

  &.c-is-todo {
    th.c-th-check-all {
      width: 1.125rem;

      .checkbox {
        margin-right: 0.2rem;
      }
    }

    th.c-th-who {
      width: 52%;      

      @include until(480px) {
        width: 35%;
      }

      @include tablet {
        width: 27%;
      }
    }

    th.c-th-method {
      width: 24%;

      @include phone {
        display: none;
      }
    }
  }

  &:not(.c-is-todo) {
    th.c-th-who {
      width: 70%;

      @include tablet {
        width: 30%;
      }
    }

    th.c-th-amount {
      width: 14%;
    }

    th.c-th-method {
      width: 19%;

      @include phone {
        display: none;
      }
    }

    th.c-th-date {
      width: 14%;
      padding-right: 0.5rem;
    }

    th.c-th-relative-to {
      padding-right: 0;
    }
  }
}

.c-action-arrow {
  display: inline-block;
  margin-left: 0.5rem;
  transform: translateY(-2px);
}

@include phone {
  .c-th-amount {
    text-align: right;
  }

  .c-th-date,
  .c-th-relative-to {
    display: none;
  }

  .c-th-actions {
    opacity: 0;
  }
}
</style>
