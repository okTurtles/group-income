<template lang="pug">
  // Note: .cpr- is for payment-row
  payment-row(:payment='payment')
    template(slot='cellPrefix')
      label.checkbox.c-check(data-set='check')
        input.input(type='checkbox' v-model='form.checked')
        span
          i18n.sr-only Mark as an item to pay

    template(slot='cellUser')
      .c-user-wrapper
        .c-user-avatar-name
          avatar-user.c-avatar(:contractID='payment.toMemberID' size='xs')
          strong.c-name {{ payment.displayName }}
        i18n.pill.is-neutral.hide-tablet(tag='div') Lightning

    template(slot='cellActions')
      i18n.pill.is-neutral.hide-phone Lightning
      i18n.is-unstyled.link.is-link-inherit.c-reset(
        tag='button'
        type='button'
        v-if='payment.amount !== config.initialAmount'
        @click='reset'
      ) Reset

    template(slot='cellSuffix')
      label.field
        .inputgroup
          input.input(data-test='amount' inputmode='decimal' pattern='[0-9]*' v-model='form.amount')
          .suffix.hide-phone {{ groupCurrency.symbolWithCode }}
          .suffix.hide-tablet {{ groupCurrency.symbol }}
</template>

<script>
import { mapGetters } from 'vuex'
import PaymentRow from './payment-row/PaymentRow.vue'
import AvatarUser from '@components/AvatarUser.vue'

export default ({
  name: 'PaymentRowSendLightning',
  components: {
    PaymentRow,
    AvatarUser
  },
  props: {
    payment: {
      type: Object, // { index, checked, ...paymentsData }
      required: true
    }
  },
  data () {
    return {
      config: {
        initialAmount: this.payment.amount
      },
      form: {
        checked: this.payment.checked,
        amount: this.payment.amount
      }
    }
  },
  watch: {
    'form.amount' (amount) {
      this.$emit('update', {
        index: this.payment.index,
        checked: true,
        amount
      })
    },
    'form.checked' (checked) {
      this.$emit('update', {
        index: this.payment.index,
        checked
      })
    },
    'payment.checked' (checked) {
      this.form.checked = checked
    }
  },
  computed: {
    ...mapGetters([
      'groupSettings',
      'groupCurrency'
    ])
  },
  methods: {
    reset () {
      this.form.amount = this.config.initialAmount
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-user-avatar-name {
  display: flex;
  align-items: center;

  .c-avatar {
    margin-right: 0.5rem;

    @include phone {
      display: none;
    }
  }
}

.c-check {
  margin-right: 0.5rem;
  margin-left: 0.5rem;

  @include desktop {
    margin-left: 2.5rem;
  }
}

.c-reset {
  margin-left: 1rem;
}

.inputgroup .input {
  @include phone {
    padding-right: 2rem;
  }
}
</style>
