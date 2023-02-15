<template lang='pug'>
modal-template(ref='modal' :a11yTitle='L("Add new members")')
  template(#title='')
    i18n Add new members

  .c-container
    i18n.is-title-4(tag='h3') Share this link to grant access to your group.
    i18n.has-text-1(tag='p') After the onboarding period has ended, everyone will be asked to vote on whether or not a new member should be added. But for now, enjoy 60 free passes!
    link-to-copy.c-link(:link='link')
    i18n.has-text-1(tag='p' :args='{ expireDate }') This invite link expires on {expireDate}.
    i18n.is-outlined.c-cta(
      tag='button'
      @click.prevent='close'
    ) Awesome
</template>
<script>
import { mapGetters } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import LinkToCopy from '@components/LinkToCopy.vue'
import { INVITE_INITIAL_CREATOR } from '@model/contracts/shared/constants.js'
import { buildInvitationUrl } from '@model/contracts/shared/voting/proposals.js'
import { serializeKey } from '../../../../shared/domains/chelonia/crypto.js'

export default ({
  name: 'InvitationLinkModal',
  components: {
    ModalTemplate,
    LinkToCopy
  },
  computed: {
    ...mapGetters([
      'currentGroupState'
    ]),
    welcomeInviteSecret () {
      const invites = this.currentGroupState._vm.invites
      console.log({ invites })
      const initialInvite = Object.keys(invites).find(invite => invites[invite].creator === INVITE_INITIAL_CREATOR)
      console.log({ initialInvite })
      const key = this.currentGroupState._volatile.keys[initialInvite]
      console.log({ key })
      if (typeof key !== 'string') {
        return serializeKey(key, true)
      } else {
        return key
      }
    },
    link () {
      return buildInvitationUrl(this.$store.state.currentGroupId, this.welcomeInviteSecret)
    },
    expireDate () {
      // TODO retrive real expire date
      // const expireDate = this.welcomeInviteSecret.expireDate // format this
      return '4th of February'
    }
  },
  methods: {
    close () {
      this.$refs.modal.close()
    }
  }
}: Object)
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-container {
  text-align: center;
  max-width: 100%;
}

.c-link {
  margin-top: 2rem;
  margin-bottom: 0.5rem;
}

.c-cta {
  margin-top: 2rem;
}
</style>
