<template lang="pug">
  banner(
    :isCard='true'
    :title='L("Invite member to your group")'
    :svg='SvgConversation'
  )
    i18n(tag='p') Start sharing your resources with the ones who matter to you!
    i18n(tag='button' @click='openModal') Add members
</template>

<script>
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'
import Banner from '@components/Banner.vue'
import SvgConversation from '@svgs/conversation.svg'

export default {
  name: 'StartInviting',
  components: {
    Banner,
    SvgConversation
  },
  data () {
    return {
      SvgConversation
    }
  },
  methods: {
    openModal () {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'InviteByLink')
    }
  }
}
</script>
