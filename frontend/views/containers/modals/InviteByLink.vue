<template lang="pug">
modal-template
  template(#title='')
    i18n Add new members

  .c-container
    i18n.title.is-4(tag="h3") Share this link with others to grant access to your group.
    i18n.has-text-1(tag="p") After the onboarding period has ended, everyone will be asked to vote on whether or not a new member should be added. But for now, enjoy 60 free passes!
    a.link.c-link(:href="link" target="_blank")
      i.icon-link
      | {{link}}
    i18n.has-text-1(tag="p") This invite link expires on the 4th of February.
    i18n.is-outlined.c-cta(
      tag="button"
      @click.prevent='close'
    ) Awesome
</template>
<script>
import ModalTemplate from '@components/Modal/ModalTemplate.vue'
import { CLOSE_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'

export default {
  name: 'InviteByLink',
  components: {
    ModalTemplate
  },
  data () {
    return {
      link: 'https://groupincome.org/f4k3_H45h_t0_5h4r3'
    }
  },
  methods: {
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    }
  }
}
</script>
<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";
.c-container {
  text-align: center;
}

.c-link {
  display: inline-block;
  margin-top: $spacer-lg;
  margin-bottom: $spacer-sm;

  .icon-link {
    margin-right: $spacer-xs;
  }
}

.c-cta {
  margin-top: $spacer*3;
}
</style>
