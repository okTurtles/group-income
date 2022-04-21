<template lang='pug'>
  modal-template(class='has-background' ref='modal' :a11yTitle='L("Hello")')
    template(slot='title')
      h1.is-title-1 Hello {{name}}!

    p Check in this demo, the #[code create()] method: we read the query and update the modal using #[code SET_MODAL_QUERIES]. That's used to remove the passed query from the URL when the modal is closed, even if the user accesses the modal through direct link or does refresh the page.
    p Real world examples: #[code RemoveMember.vue] and #[code PaymentDetail.vue].

    button(@click='openModal("SignupModal")') Open SubModal
</template>

<script>
import sbp from '@sbp/spb'
import { OPEN_MODAL, CLOSE_MODAL, SET_MODAL_QUERIES } from '@utils/events.js'
import LoginForm from '@containers/access/LoginForm.vue'
import ModalTemplate from '@components/modal/ModalTemplate.vue'

export default ({
  name: 'LoginModal',
  components: {
    ModalTemplate,
    LoginForm
  },
  created () {
    const name = this.$route.query.name

    if (name) {
      this.name = name
      sbp('okTurtles.events/emit', SET_MODAL_QUERIES, 'DSModalQuery', { name })
    } else {
      console.warn('DSModalQuery: Missing valid query "name".')
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    }
  },
  data: () => ({
    name: null
  }),
  methods: {
    openModal (name) {
      sbp('okTurtles.events/emit', OPEN_MODAL, name)
    }
  }
}: Object)
</script>
