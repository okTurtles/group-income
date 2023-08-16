<template lang='pug'>
modal-template(ref='modal' :a11yTitle='L("Add new members")')
  template(#title='')
    i18n Add new members

  .c-container
    template(v-if='link')
      i18n.is-title-4(tag='h3') Share this link to grant access to your group.
      i18n.has-text-1(tag='p') After the onboarding period has ended, everyone will be asked to vote on whether or not a new member should be added. But for now, enjoy 60 free passes!
      link-to-copy.c-link(:link='link')
      i18n.has-text-1(tag='p' :args='{ expireDate }') This invite link expires on {expireDate}.
      i18n.is-outlined.c-cta(tag='button' @click.prevent='close') Awesome
    .c-broken(v-else)
      svg-broken-link.c-svg
      i18n.is-title-4(tag='h3') Broken invite link!
      i18n(
        tag='p'
        @click='handleBrokenInviteClick'
        :args='{ \
          a_: `<button class="link js-click">`, \
          _a: "</button>" \
        }'
      ) See {a_}logs for details{_a}.
      i18n.is-outlined.c-cta(tag='button' @click.prevent='close') OK
</template>
<script>
import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import { mapGetters } from 'vuex'
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import LinkToCopy from '@components/LinkToCopy.vue'
import { INVITE_INITIAL_CREATOR } from '@model/contracts/shared/constants.js'
import { buildInvitationUrl } from '@model/contracts/shared/voting/proposals.js'
import { serializeKey } from '../../../../shared/domains/chelonia/crypto.js'
import { humanDate } from '@model/contracts/shared/time.js'
import { REPLACE_MODAL } from '@utils/events.js'
import SvgBrokenLink from '@svgs/broken-link.svg'

export default ({
  name: 'InvitationLinkModal',
  components: {
    ModalTemplate,
    LinkToCopy,
    SvgBrokenLink
  },
  computed: {
    ...mapGetters([
      'currentGroupState'
    ]),
    welcomeInviteId () {
      const invites = this.currentGroupState.invites
      const initialInvite = Object.keys(invites).find(invite => invites[invite].creator === INVITE_INITIAL_CREATOR)
      return initialInvite
    },
    welcomeInviteSecret () {
      const key = this.$store.state.secretKeys[this.welcomeInviteId]
      if (!key) {
        console.error(`undefined key for welcomeInviteId: ${this.welcomeInviteId}`)
        return undefined
      }
      return typeof key !== 'string' ? serializeKey(key, true) : key
    },
    link () {
      const key = this.welcomeInviteSecret
      if (key) {
        return buildInvitationUrl(this.$store.state.currentGroupId, this.currentGroupState.settings?.groupName, key)
      }
    },
    expireDate () {
      let expireDate
      try {
        expireDate = this.currentGroupState._vm.authorizedKeys[this.welcomeInviteId].meta.expires
      } catch (e) {
        console.warning('An error occurred trying to get the invite expiration date', e)
      }
      return humanDate(expireDate, { month: 'long', day: 'numeric' })
    }
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    handleBrokenInviteClick (e) {
      if (e.target.classList.contains('js-click')) {
        sbp('okTurtles.events/emit', REPLACE_MODAL, 'UserSettingsModal', {
          section: 'application-logs',
          errorMsg: 'Undefined key for invite'
        })
      }
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
