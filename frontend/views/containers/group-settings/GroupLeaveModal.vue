<template lang='pug'>
  modal-template(ref='modal' :a11yTitle='L("Leave group")')
    template(slot='title')
      i18n Leave group

    form(novalidate @submit.prevent='submit' data-test='leaveGroup')
      i18n(
        tag='strong'
        :args='{ groupName: groupSettings.groupName }'
      ) Are you sure you want to leave {groupName}?

      i18n(
        tag='p'
      ) You will no longer be able to send or see messages in this channel.

      .buttons
        i18n.is-outlined(tag='button' @click='close') Cancel
        button-submit.is-danger(
          @click='submit'
          data-test='btnSubmit'
        ) {{ L('Leave Channel') }}
</template>

<script>
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import { mapGetters } from 'vuex'

export default {
  name: 'GroupLeaveModal',
  components: {
    ModalTemplate,
    ButtonSubmit
  },
  computed: {
    ...mapGetters([
      'groupSettings'
    ])
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    async submit () {
      this.close()
      console.log('Todo')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-banner {
  margin: 1.5rem 0;
}
</style>
