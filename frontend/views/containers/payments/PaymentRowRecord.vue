<template lang='pug'>
tr
  td
    label.checkbox
      input.input(type='checkbox' v-model='payment.checked')
      span
  td
    .c-user
      avatar-user.c-avatar(:username='payment.username' size='xs')
      strong.c-name {{ payment.displayName }}

    // TODO: replace condition to indicate whether or not the payment date is < or > than the current date using payment.paymentStatusText
    i18n.c-user-month(
      :class='Math.round(Math.random()) ? "has-text-1" : "pill is-danger"'
      :args='{date: dueDate(payment.date) }'
    ) Due {date}

  td
    .c-actions
      .c-actions-month.has-text-1 {{ dueDate(payment.date) }}
      i18n.is-unstyled.is-link-inherit.link.c-reset(
        tag='button'
        type='button'
        @click='reset'
      ) Reset

  td
    label.field
      .inputgroup
        input.input(inputmode='decimal' pattern='[0-9]*' :value='payment.amount')
        .suffix.hide-phone {{symbolWithCode}}
        .suffix.hide-tablet {{symbol}}
</template>

<script>
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import currencies from '@view-utils/currencies.js'
import { humanDate } from '@view-utils/humanDate.js'

export default {
  name: 'PaymentRowRecord',
  components: {
    AvatarUser
  },
  props: {
    payment: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapGetters([
      'groupSettings'
    ]),
    symbolWithCode () {
      return currencies[this.groupSettings.mincomeCurrency].symbolWithCode
    },
    symbol () {
      return currencies[this.groupSettings.mincomeCurrency].symbol
    }
  },
  methods: {
    // TEMP
    async reset () {
      console.log('Todo: Implement reset payment')
    },
    dueDate (datems) {
      return humanDate(datems, { month: 'short', day: 'numeric' })
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-payments {
  margin-top: 1rem;

  th, td {
    &:first-child {
      width: 41%;
    }

    &:last-child {
      width: 10%;
      padding-left: 1rem;

      @include tablet {
        width: 22%;
      }
    }
  }

  .c-header-checkbox {
    line-height: 23px;
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

.is-editing {
  th, td {
    &:first-child {
      width: 10%;
      @include phone {
        width: 3rem;
      }
    }

    &:last-child {
      width: 40%;
      min-width: 9,375rem;
      display: table-cell;
    }
  }

  .c-actions {
    justify-content: flex-end;
  }

  .c-reset {
    margin-left: 1rem;
  }

  .c-payments-date {
    @include phone {
      display: block;
    }
  }
}

.checkbox {
  margin-right: 0.5rem;
}

.c-actions {
  justify-content: space-between;
}

.c-actions,
.c-user {
  display: flex;
  align-items: center;
}

.c-avatar {
  margin-right: 0.5rem;
}

.c-avatar,
.c-actions-month {
  @include phone {
    display: none;
  }
}

.c-actions-month {
  margin-left: 0;
  white-space: nowrap;
}

.c-actions-menu {
  margin-left: 1rem;
}

.c-name {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.c-user-month {
  display: none;
  @include phone {
    display: inline-block;
    margin-left: 0;
  }
}

.c-payments-amount-text {
  @include tablet {
    margin-right: 0.5rem;
  }
}

.c-payments-amount {
  &-info {
    display: inline-flex;
    align-items: center;

    @include phone {
      display: flex;
      flex-direction: row;
      justify-content: flex-end;
    }
  }

  &-text {
    @include phone {
      display: block;
    }
  }

  .is-small {
    margin: 0;
  }
}

.inputgroup .input {
  @include phone {
    padding-right: 2rem;
  }
}

</style>
