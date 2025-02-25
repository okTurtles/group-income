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
      th.c-th-method.hide-phone {{ titles.three }}
      th.c-th-date.hide-phone {{ titles.four }}
      th.c-th-relative-to(v-if='paymentsType !== "PaymentRowTodo"')
        | {{ L('Relative to') }}
        i.icon-sort-down.c-action-arrow
      th.c-th-action(v-if='paymentsType !== "PaymentRowTodo"')
  tbody
    component(
      v-for='(payment, index) in paymentsList'
      ref='paymentItem'
      :key='payment.hash || index'
      :payment='payment'
      :is='paymentsType'
      @change='onItemChange'
    )
</template>

<script>
import sbp from '@sbp/sbp'
import AvatarUser from '@components/AvatarUser.vue'
import Tooltip from '@components/Tooltip.vue'
import PaymentRowTodo from './PaymentRowTodo.vue'
import PaymentRowSent from './PaymentRowSent.vue'
import PaymentRowReceived from './PaymentRowReceived.vue'
import { PAYMENTS_RECORDED } from '@utils/events.js'

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
    },
    selectedTodoItems: {
      // a prop that is specifically for 'PaymentRowTodo' type.
      type: Array
    }
  },
  beforeMount () {
    sbp('okTurtles.events/on', PAYMENTS_RECORDED, this.resetTodoSelectionInfo)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', PAYMENTS_RECORDED, this.resetTodoSelectionInfo)
  },
  data () {
    return {
      form: {
        checkAll: false,
        selectedItemHashes: []
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
    },
    allSelectedTodoItems () {
      return this.paymentsType === 'PaymentRowTodo'
        ? this.form.selectedItemHashes
          .map(hash => this.paymentsList.find(p => p.hash === hash))
          .filter(Boolean)
        : null
    }
  },
  watch: {
    'form.checkAll' (val) {
      const method = val ? 'select' : 'deselect'

      this.$refs.paymentItem.forEach(c => c[method](true))
    },
    'paymentsType': {
      immediate: true,
      handler (type) {
        if (type === 'PaymentRowTodo') {
          this.syncSelectedTodoItems()
        }
      }
    }
  },
  methods: {
    onItemChange (data) {
      if (this.paymentsType === 'PaymentRowTodo') {
        const { hash, checked } = data

        if (checked) {
          this.form.selectedItemHashes.push(hash)
        } else {
          this.form.selectedItemHashes = this.form.selectedItemHashes
            .filter(v => v !== hash)
        }

        this.syncSelectedTodoItems()
      }
    },
    resetTodoSelectionInfo () {
      this.form.selectedItemHashes = []
      this.syncSelectedTodoItems()
    },
    syncSelectedTodoItems () {
      this.$emit('update:selectedTodoItems', this.allSelectedTodoItems)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-payments {
  margin-top: 1rem;

  th.c-th-amount {
    @include phone {
      text-align: right;
    }

    @include payment-table-desktop {
      min-width: 4.5rem;
    }
  }

  th.c-th-method {
    @include payment-table-desktop {
      min-width: 7.25rem;
    }
  }

  th.c-th-date {
    @include payment-table-desktop {
      min-width: 6.25rem;
    }
  }

  th.c-th-relative-to {
    @include payment-table-desktop {
      min-width: 5.25rem;
    }
  }

  ::v-deep td.c-td-user {
    @include tablet {
      padding-right: 0.5rem;
    }

    @include desktop {
      max-width: 12rem;
      min-width: 10rem;
      overflow: hidden;

      .c-user {
        max-width: inherit;

        .c-twrapper {
          width: 100%;
        }
      }
    }

    @include from (1360px) {
      max-width: 16rem;
    }
  }

  &.c-is-todo {
    th.c-th-check-all {
      width: 1.125rem;
      font-size: 14px; // font-size here has to be fixed. Otherwise, it leads to a UI bug(The check icon moving downwards)

      .checkbox {
        margin-right: 0.2rem;
      }
    }

    th.c-th-who {
      width: 40%;

      @include tablet {
        width: 35%;
      }
    }

    th.c-th-method {
      width: 20%;

      @include tablet {
        padding-right: 0.5rem;
        min-width: 8rem;
      }
    }

    th.c-th-amount {
      width: 55%;

      @include tablet {
        width: 16%;
      }
    }

    th.c-th-date {
      @include desktop {
        padding-right: 1.5rem;
        min-width: 4.25rem;
      }
    }
  }

  &:not(.c-is-todo) {
    th.c-th-who {
      width: 40%;

      @include tablet {
        width: 30%;
      }
    }

    th.c-th-amount {
      width: 55%;

      @include tablet {
        width: 20%;
      }

      @include desktop {
        width: 14%;
      }
    }

    th.c-th-method {
      @include tablet {
        width: 24%;
        padding-right: 0.5rem;
      }

      @include payment-table-desktop {
        width: 19%;
      }
    }

    th.c-th-date {
      width: 18%;
      padding-right: 0.5rem;

      @include desktop {
        width: 22%;
      }
    }

    th.c-th-relative-to {
      display: none;
      padding-right: 0;

      @include payment-table-desktop {
        display: table-cell;
        width: 14%;
      }
    }

    th.c-th-action {
      display: none;

      @include payment-table-desktop {
        display: table-cell;
        width: 5%;
      }
    }
  }
}

.c-action-arrow {
  display: inline-block;
  margin-left: 0.5rem;
  transform: translateY(-2px);
}
</style>
