<template lang='pug'>
  tr.c-row
    td(v-if='$slots["cellPrefix"]')
      slot(name='cellPrefix')
    td
      .c-user
        avatar-user.c-avatar(:username='payment.username' size='xs')
        strong.c-name {{payment.displayName}}

      // TODO: replace condition to indicate whether or not the payment date
      // is < or > than the current date using payment.paymentStatusText
      i18n.c-user-date(
        :class='Math.round(Math.random()) ? "has-text-1" : "pill is-danger"'
        :args='{ date: humanDate(payment.date) }'
      ) Due {date}

    td.c-td-amount(v-if='$slots["cellAmount"]')
      slot(name='cellAmount')

    td
      .cpr-actions
        slot(name='cellActions')

    td(v-if='$slots["cellSuffix"]')
      slot(name='cellSuffix')
</template>

<script>
import AvatarUser from '@components/AvatarUser.vue'
import { humanDate } from '@utils/time.js'

export default {
  name: 'PaymentRowSent',
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
  },
  methods: {
    humanDate
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

// .cpr = c-payments-row
// .cpr-* is used/overridden by parents

.cpr-date {
  margin-left: 0;
  white-space: nowrap;

  @include phone {
    display: none;
  }
}

.cpr-actions {
  justify-content: space-between;
}

.cpr-actions,
.c-user {
  display: flex;
  align-items: center;
}

.c-avatar {
  margin-right: 0.5rem;

  @include phone {
    display: none;
  }
}

.c-name {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.c-td-amount {
  @include phone {
    text-align: right;
  }
}

.c-user-date {
  display: none;

  @include phone {
    display: inline-block;
    margin-left: 0;
  }
}
</style>
