<template lang="pug">
modal-template(
  class='has-background'
  ref='modal'
  :a11yTitle='L("Send Thank You Modal")'
)
  template(slot='subtitle')
    i18n Received payments
  template(slot='title')
    i18n(v-if='!isConfirmation') Thank you!
    i18n(v-else key='title_confirm') Your Thank You was sent!

  form.c-form(
    @submit.prevent=''
    @keyup.enter='onEnterPressed'
  )
    label.field(v-if='!isConfirmation' key='thanks')
      i18n.label What message would you like to send?

      textarea.textarea(
        v-model='form.memo'
        ref='thanks'
        maxlength='500'
      )

    .c-confirmation(v-else)
      svg-hello.c-svg

    .buttons.c-buttons-container(:class='{ "is-centered": isConfirmation }')
      button.is-outlined(
        v-if='isConfirmation'
        key='awesome'
        type='button'
        @click='close'
      ) {{ L('Awesome') }}

      template(v-else)
        button.is-outlined(
          key='back'
          type='button'
          @click='close'
        ) {{ L('Back') }}

        button-submit.is-success(
          key='submit'
          :disabled='!form.memo'
          @click='submit'
        ) {{ L('Send Thanks!') }}
</template>

<script>
import sbp from '@sbp/sbp'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import SvgHello from '@svgs/hello.svg'

export default ({
  name: 'SendThankYouModal',
  components: {
    ModalTemplate,
    ButtonSubmit,
    SvgHello
  },
  data () {
    return {
      isConfirmation: false,
      form: {
        memo: null
      }
    }
  },
  methods: {
    close () {
      this.$refs.modal.close(0)
    },
    submit () {
      try {
        sbp('gi.actions/group/sendPaymentThankYou', {
          contractID: this.$store.state.currentGroupId,
          data: {
            toUser: this.$route.query.to,
            memo: this.form.memo
          }
        })
      } catch (err) {
        console.error('send thank you note error: ', err)

        return
      }

      this.isConfirmation = true
    }
  }
})
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-confirmation {
  text-align: center;
  margin-bottom: 2.875rem;
}

.c-buttons-container {
  @include phone {
    flex-direction: column-reverse;
    align-items: stretch;
    gap: 1rem;
  }
}
</style>
