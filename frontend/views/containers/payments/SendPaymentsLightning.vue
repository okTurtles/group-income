<template lang="pug">
modal-base-template(
  :fullscreen='true'
  class='has-background'
  :a11yTitle='L("Sned payments via Lightning")'
)
  .c-header
    i18n.is-title-2.c-title(tag='h2') Send payment via Lightning

  .c-content
    form.card.c-card(
      @submit.prevent=''
      novalidate='true'
    )
      .c-section-payments-list
        i18n.is-title-3.c-sub-title(tag='h3') Send payment

        record-payments-list(
          :paymentsList='ephemeral.dummyListData'
          @update='updateItem'
        )
      .c-section-qr-code
</template>

<script>
import sbp from '@sbp/sbp'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import RecordPaymentsList from './RecordPaymentsList.vue'
import { randomHexString } from '@model/contracts/shared/giLodash.js'

const fakeUser1 = {
  username: 'fake-user-1',
  email: 'fake1@abc.com',
  password: '123456789'
}
const fakeUser2 = {
  username: 'fake-user-2',
  email: 'fake2@def.com',
  password: '123456789'
}

const dummyListData = [
  {
    hash: randomHexString(10),
    username: fakeUser1.username,
    displayName: fakeUser1.username,
    amount: 98.57142857,
    total: 98.57142857,
    partial: false,
    isLate: false,
    date: '2022-09-24T11:27:28.893Z',
    index: 0,
    checked: false
  },
  {
    hash: randomHexString(10),
    username: fakeUser2.username,
    displayName: fakeUser2.username,
    amount: 250,
    total: 250,
    partial: false,
    isLate: false,
    date: '2022-09-24T11:27:28.893Z',
    index: 1,
    checked: false
  }
]

export default ({
  name: 'SendPayemntsLightning',
  components: {
    ModalBaseTemplate,
    RecordPaymentsList
  },
  data () {
    return {
      ephemeral: {
        dummyListData
      }
    }
  },
  created () {
    this.initFakeUsers()
  },
  methods: {
    async initFakeUsers () {
      // check if the fake users exist and sign them up if not.
      // TODO: to be removed once lightning network is implemented

      for (const userData of [fakeUser1, fakeUser2]) {
        const contractID = await sbp('namespace/lookup', userData.username)

        if (!contractID) {
          console.log(`signing up a fake user [${userData.username}]`)
          await sbp('gi.actions/identity/signup', userData)
        }
      }
    },
    updateItem (data) {
      console.log('updating the item: ', data)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-header {
  position: absolute;
  top: 0;
  left: 0;
  background: $background_0;
  padding: 1.5rem 0 1.5rem 2rem;
  width: 100%;

  @include tablet {
    text-align: center;
  }

  @include desktop {
    position: relative;
    background: transparent;
    max-width: 50.25rem;
    text-align: left;
  }
}

.c-card {
  position: relative;
  display: flex;
  flex-direction: column;

  @include tablet {
    padding: 2.5rem 2rem 2.5rem 0;
    flex-direction: row;
    align-items: flex-start;
  }
}

.c-section-payments-list {
  @include tablet {
    flex-grow: 1;
  }
}

.c-section-qr-code {
  position: relative;
  display: flex;

  @include tablet {
    flex-direction: column;
  }
}

.c-content {
  position: relative;
  display: block;
  padding-top: 7.25rem;
  width: 100%;

  @include tablet {
    max-width: 50.25rem;
  }

  @include desktop {
    padding-top: 0;
  }
}

.c-sub-title {
  padding-left: 0.5rem;

  @include tablet {
    padding-left: 2.5rem;
  }
}
</style>
