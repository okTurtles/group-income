<template lang='pug'>
  tr.c-row(data-test='payRow')
    td(v-if='$slots["cellPrefix"]')
      slot(name='cellPrefix')
    td.c-td-user
      slot(name='cellUser')
      template(v-if='!$slots["cellUser"]')
        .c-user
          profile-card(
            :contractID='payment.toMemberID'
            direction='top-left'
          )
            avatar-user.c-avatar(:contractID='payment.toMemberID' size='xs')
            strong.c-name {{payment.displayName}}

        span.c-user-date(:class='payment.isLate ? "pill is-danger" : "has-text-1"') {{ humanDate(payment.date) }}

    td.c-td-amount(v-if='$slots["cellAmount"]')
      slot(name='cellAmount')

    td(v-if='$slots["cellMethod"]')
      slot(name='cellMethod')

    td(v-if='$slots["cellDate"]')
      slot(name='cellDate')

    td(v-if='$slots["cellRelativeTo"]')
      slot(name='cellRelativeTo')

    td.c-td-actions
      .cpr-actions
        slot(name='cellActions')

    td(v-if='$slots["cellSuffix"]')
      slot(name='cellSuffix')
</template>

<script>
import AvatarUser from '@components/AvatarUser.vue'
import ProfileCard from '@components/ProfileCard.vue'
import { humanDate } from '@model/contracts/shared/time.js'

export default ({
  name: 'PaymentRowSent',
  components: {
    ProfileCard,
    AvatarUser
  },
  props: {
    payment: {
      type: Object,
      required: true
    }
  },
  methods: {
    humanDate
  }
}: Object)
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

.cpr-actions,
.c-user {
  display: flex;
  align-items: center;
}

.cpr-actions {
  justify-content: space-between;
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

td.c-td-actions {
  @include desktop {
    padding-right: 1.5rem;
  }
}
</style>
