<template lang="pug">
modal-base-template(
  :fullscreen='true'
  class='has-background'
  :a11yTitle='L("Send payments via Lightning")'
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
          :addDonationFee='ephemeral.addDonationFee'
          paymentType='lightning'
          @update='updateItem'
        )

        .c-toggles-wrapper
          .c-toggle-comment
            .c-toggle-flex
              .c-toggle-flex-info
                i18n.has-text-bold(
                  tag='h4'
                  :args='{ span_: `<span class="has-text-small has-text-1 has-text-normal">`, _span: "</span>" }'
                ) Add a note {span_}(optional){_span}

                i18n.has-text-small.has-text-1(tag='p') Leave a message to the group members selected above.

              .c-toggle-flex-action
                input.switch(
                  type='checkbox'
                  name='displayComment'
                  v-model='ephemeral.displayMemo'
                )
                i18n.sr-only(tag='label' for='displayComment') Toggle comment box

            transition(name='slidedown')
              label.field(v-if='ephemeral.displayMemo')
                i18n.sr-only.label Leave a message
                textarea.textarea.c-comment(
                  rows='4'
                  @input='config.debouncedMemoUpdate'
                  :value='form.memo'
                )

          .c-toggle-donation.c-toggle-flex
            .c-toggle-flex-info
              i18n.has-text-bold(tag='h4') Donation fee
              i18n.has-text-small.has-text-1(tag='p') Donate 1% to support the development of Group Income

            .c-toggle-flex-action
              input.switch(
                type='checkbox'
                name='addDonationFee'
                v-model='ephemeral.addDonationFee'
              )
              i18n.sr-only(tag='label' for='addDonationFee') Toggle donation fee

      .c-section-qr-code
        i18n.has-text-bold.c-qr-code-header(tag='h4') QR code payment

        qr-code.c-qr-code-img(
          :sideLength='172'
          :value='dummyQRstring'
        )

        i18n.c-qr-code-instruction.has-text-1(tag='p')
          | To complete your payment,
          | please use your payment app to scan the QR code with your phone or copy the payment link.

        copyable-input.c-copy-link(
          :uneditable='true'
          :value='dummyLinkToCopy'
          tooltipDirection='top'
        )
</template>

<script>
import { Vue } from '@common/common.js'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import RecordPaymentsList from './RecordPaymentsList.vue'
import QrCode from '@components/QrCode.vue'
import CopyableInput from '@components/CopyableInput.vue'
import { randomHexString, debounce } from '@model/contracts/shared/giLodash.js'

const dummyListData = [
  {
    hash: randomHexString(10),
    username: 'fake-user-1',
    displayName: 'fake-user-1',
    amount: 98.57,
    total: 98.57,
    partial: false,
    isLate: false,
    date: '2022-09-24T11:27:28.893Z',
    index: 0,
    checked: false
  },
  {
    hash: randomHexString(10),
    username: 'fake-user-2',
    displayName: 'fake-user-2',
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
  name: 'SendPayemntsViaLightning',
  components: {
    ModalBaseTemplate,
    RecordPaymentsList,
    CopyableInput,
    QrCode
  },
  data () {
    return {
      ephemeral: {
        dummyListData,
        displayMemo: false,
        addDonationFee: true
      },
      config: {
        debouncedMemoUpdate: debounce(this.onMemoUpdate, 650)
      },
      form: {
        memo: ''
      }
    }
  },
  computed: {
    dummyQueryString () {
      const checkedToStr = this.ephemeral.dummyListData.filter(item => item.checked)
        .map(({ username, amount }) => `to=${username}_amount=${amount}`)
        .join('?')

      const allStr = [
        checkedToStr,
        this.ephemeral.displayMemo && this.form.memo && `memo=${this.form.memo}`,
        this.ephemeral.addDonationFee && checkedToStr && 'donation=true'
      ].filter(Boolean).join('?')

      return allStr ? `?${allStr}` : ''
    },
    dummyLinkToCopy () {
      return `https://groupincome.org/dummy-pay-link/f4k3_H45h_t0_5h4r3${this.dummyQueryString}`
    },
    dummyQRstring () {
      return `https://groupincome.org/dummy-qr${this.dummyQueryString}`
    }
  },
  methods: {
    updateItem ({ index, ...data }) {
      Vue.set(this.ephemeral.dummyListData, index, {
        ...this.ephemeral.dummyListData[index],
        ...data
      })
    },
    onMemoUpdate ({ target }) {
      this.form.memo = target.value
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

@mixin divider-bottom {
  box-shadow: inset 0 -2px 0 $general_2;
}

@mixin only-tablet {
  @media screen and (min-width: $tablet) and (max-width: $desktop - 1px) {
    @content;
  }
}

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
  gap: 1.375rem;

  @include desktop {
    padding: 2.5rem 2rem 2.5rem 0;
    flex-direction: row;
    align-items: flex-start;
    gap: 2.25rem;
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
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 19.375rem;
  margin: 0 auto;
  min-height: 12.875rem;
  border: 1px solid rgba(0, 0, 0, 0);
  border-radius: 3px;

  @include tablet {
    border-color: $general_0;
    align-items: stretch;
    max-width: unset;
    padding: 1rem 13rem 1rem 1rem;
  }

  @include desktop {
    width: 13.75rem;
    padding: 2.5rem 1.5rem 1.5rem;
  }
}

.c-qr-code-header {
  margin-bottom: 0.75rem;
}

.c-qr-code-img {
  margin-bottom: 0.75rem;

  @include only-tablet {
    position: absolute !important;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
    margin-bottom: 0;
  }
}

.c-qr-code-instruction {
  font-size: $size_4;
  margin-bottom: 1.375rem;

  @include desktop {
    margin-bottom: 3.25rem;
  }
}

.c-content {
  position: relative;
  display: block;
  padding-top: 7.25rem;
  width: 100%;
  max-width: 33.375rem;

  @include desktop {
    padding-top: 0;
    max-width: 50.25rem;
  }
}

.c-sub-title {
  padding-left: 0.5rem;

  @include desktop {
    padding-left: 2.5rem;
  }
}

.c-toggle-comment,
.c-toggle-donation {
  padding: 0.75rem 0 0.75rem 0.5rem;
  @include divider-bottom;

  @include desktop {
    padding-left: 2.5rem;
    box-shadow: none;
  }
}

.c-toggle-comment {
  @include divider-bottom;
}

.c-toggle-flex {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.c-comment {
  margin-top: 1rem;
}

.c-copy-link {
  align-self: stretch;

  @include phone {
    margin-bottom: 0.5rem;
  }
}
</style>
