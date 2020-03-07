<template lang='pug'>
modal-template(ref='modal')
  template(slot='title')
    i18n Payment details

  .is-title-2.c-title {{ currency(fakeStore.amount) }}
  i18n.c-subtitle.has-text-1(
    :args='{ name: fakeStore.to }'
  ) Sent to {name}

  ul.c-payment-list
    li.c-payment-list-item
      i18n.has-text-1(tag='label') Date & Time
      strong {{ moment(fakeStore.date).format('hh:mm - MMMM DD, YYYY') }}
    li.c-payment-list-item
      i18n.has-text-1(tag='label') Relative to
      strong {{ moment(fakeStore.relativeTo).format('MMMM')}}
    li.c-payment-list-item
      i18n.has-text-1(tag='label') Mincome at the time
      strong {{ currency(groupSettings.mincomeAmount) }}
    li.c-payment-list-item.c-column
      i18n.has-text-1(tag='label') Notes
      p {{ fakeStore.note }}

  .buttons
    i18n.button.is-danger.is-outlined.is-small(
      tag='button'
      @click='submit'
    ) Cancel payment
</template>

<script>
import { mapGetters } from 'vuex'
import moment from 'moment'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import currencies from '@view-utils/currencies.js'

export default {
  name: 'PaymentDetail',
  data () {
    return {
      // Temp until modal params are merged
      fakeStore: {
        to: 'pierre',
        date: new Date(),
        relativeTo: new Date(),
        amount: 20,
        note: 'Love you so much! Thank you for the Portuguese class last week. P.S.: sent to the Paypal email on your profile.'
      }
    }
  },
  components: {
    ModalTemplate
  },
  computed: {
    ...mapGetters([
      'groupSettings'
    ]),
    currency () {
      return currencies[this.groupSettings.mincomeCurrency].displayWithCurrency
    }
  },
  methods: {
    closeModal () {
      this.$refs.modal.close()
    },
    async submit () {
      console.log('Todo: Implement cancel payment')
      this.close()
    },
    moment
  },
  validations: {
    form: {}
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-payment-list {
  margin: $spacer auto $spacer-sm auto;
  width: 100%;
  max-width: 25rem;
}

.c-subtitle,
.c-title {
  text-align: center;
  width: 100%;
}

.c-subtitle {
  margin-top: $spacer-xs;

  @include tablet {
    margin-bottom: $spacer-xs;
  }
}

.c-payment-list-item {
  height: 3.3125rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid $general_0;

  &.c-column {
    flex-direction: column;
    height: auto;
    align-items: flex-start;

    .has-text-1 {
      padding-top: 1rem;
      padding-bottom: 0.3125rem
    }
  }
}

.buttons {
  justify-content: center;
}
</style>
