<template lang='pug'>
div
  img.c-logo(src='/assets/images/logo-transparent.png')

  loading(theme='fullView' v-if='isStatus("LOADING")')
  .c-page(v-else)
    div(v-if='isStatus("SIGNING") || isStatus("LOGGING")')
      .c-header
        .c-avatars
          avatar.c-avatars-group(
            v-if='ephemeral.invitation.groupPicture'
            :src='ephemeral.invitation.groupPicture'
            size='lg'
          )
          avatar.c-avatars-creator(
            v-if='ephemeral.invitation.creatorPicture'
            :src='ephemeral.invitation.creatorPicture'
          )
        h1.is-title-1.c-title(data-test='groupName') {{ ephemeral.invitation.groupName }}
        p.has-text-1(data-test='invitationMessage') {{ ephemeral.invitation.message }}
      .card
        signup-form(v-if='isStatus("SIGNING")' :postSubmit='accept')
        login-form(v-else :postSubmit='accept')

      p.c-switchEnter(v-if='isStatus("SIGNING")')
        i18n Already have an account?
        | &nbsp;
        i18n.link(tag='button' @click='pageStatus = "LOGGING"') Log in
      p.c-switchEnter(v-else)
        i18n Not on Group Income yet?
        | &nbsp;
        i18n.link(tag='button' @click='pageStatus = "SIGNING"') Create an account

    .c-joined(v-else-if='isStatus("JOINED")')
      svg-create-group.c-svg
      i18n.is-title-1(tag='h1' data-test='pageTitle' :args='{ groupName: ephemeral.groupInfo.name }') You are already a member of '{groupName}'
      i18n.has-text-1(tag='p' data-test='helperText') You cannot join already joined group.
      i18n.c-goHome(tag='button' @click='goToDashboard(ephemeral.groupInfo.id)') Go to dashboard
    .c-broken(v-else-if='isStatus("INVALID")')
      svg-broken-link.c-svg
      i18n.is-title-1(tag='h1' data-test='pageTitle' :args='LTags()') Oh no! {br_}This invite is not valid
      p.has-text-1(data-test='helperText') {{ ephemeral.errorMsg }}
      i18n.c-goHome(tag='button' @click='goHome') Take me home
    .c-broken(v-else-if='isStatus("EXPIRED")')
      svg-broken-link.c-svg
      i18n.is-title-1(tag='h1' data-test='pageTitle' :args='LTags()') Oh no! {br_}This invite is already expired
      p.has-text-1(data-test='helperText') {{ ephemeral.errorMsg }}
      i18n.c-goHome(tag='button' @click='goHome') Take me home
</template>

<script>
import { L, LTags } from '@common/common.js'
import Avatar from '@components/Avatar.vue'
import Loading from '@components/Loading.vue'
import LoginForm from '@containers/access/LoginForm.vue'
import SignupForm from '@containers/access/SignupForm.vue'
import sbp from '@sbp/sbp'
import SvgBrokenLink from '@svgs/broken-link.svg'
import SvgCreateGroup from '@svgs/create-group.svg'
import { LOGIN } from '@utils/events.js'
import { mapGetters, mapState } from 'vuex'
import { INVITE_STATUS } from '@chelonia/lib/constants'
import { PROFILE_STATUS } from '@model/contracts/shared/constants.js'
import { keyId } from '@chelonia/crypto'

let syncFinished = false
sbp('okTurtles.events/once', LOGIN, () => { syncFinished = true })

export default ({
  name: 'Join',
  components: {
    Loading,
    LoginForm,
    SignupForm,
    Avatar,
    SvgBrokenLink,
    SvgCreateGroup
  },
  data () {
    return {
      ephemeral: {
        pageStatus: 'LOADING',
        invitation: {},
        groupInfo: {},
        hash: null
      }
    }
  },
  computed: {
    ...mapGetters(['ourIdentityContractId']),
    ...mapState(['currentGroupId']),
    pageStatus: {
      get () { return this.ephemeral.pageStatus },
      set (status) {
        const possibleStatus = ['LOADING', 'SIGNING', 'LOGGING', 'INVALID', 'EXPIRED', 'JOINED']
        if (!possibleStatus.includes(status)) {
          throw new Error(`Bad status: ${status}. Use one of the following: ${possibleStatus.join(', ')}`)
        }
        this.ephemeral.pageStatus = status
      }
    }
  },
  mounted () {
    // For some reason in some Cypress tests it loses the route hash when initialized is called
    this.ephemeral.hash = new URLSearchParams(this.$route.hash.slice(1))
    if (syncFinished || !this.ourIdentityContractId) {
      this.initialize()
    } else {
      sbp('okTurtles.events/once', LOGIN, () => this.initialize())
    }
  },
  methods: {
    async initialize () {
      try {
        const messageToAskAnother = L('You should ask for a new one. Sorry about that!')
        const groupId = this.ephemeral.hash.get('groupId')
        const secret = this.ephemeral.hash.get('secret')
        if (!groupId || !secret) {
          console.error('Invalid invite link: missing group ID or secret')
          this.ephemeral.errorMsg = messageToAskAnother
          this.pageStatus = 'INVALID'
          return
        }
        const state = await sbp('chelonia/latestContractState', groupId)
        const publicKeyId = keyId(secret)
        const invite = state._vm.invites[publicKeyId]
        if (invite?.expires < Date.now()) {
          console.log('Join.vue error: Link is already expired.')
          this.ephemeral.errorMsg = messageToAskAnother
          this.pageStatus = 'EXPIRED'
          return
        } else if (invite?.initialQuantity > 0 && !invite.quantity) {
          console.log('Join.vue error: Link is already used.')
          this.ephemeral.errorMsg = messageToAskAnother
          this.pageStatus = 'INVALID'
          return
        } if (invite?.status !== INVITE_STATUS.VALID) {
          console.error('Join.vue error: Link is not valid.')
          this.ephemeral.errorMsg = messageToAskAnother
          this.pageStatus = 'INVALID'
          return
        }
        if (this.ourIdentityContractId) {
          const targetGroupId = this.ephemeral.hash?.get('groupId') || ''
          const targetGroupState = this.$store.state[targetGroupId] || {}

          if (this.currentGroupId && [PROFILE_STATUS.ACTIVE, PROFILE_STATUS.PENDING].includes(targetGroupState?.profiles?.[this.ourIdentityContractId])) {
            this.goToDashboard()
          } else if (this.checkAlreadyJoinedGroup(targetGroupId)) { // if the user is already part of the target group.
            this.ephemeral.groupInfo = {
              name: targetGroupState.settings?.groupName || '',
              id: targetGroupId
            }
            this.pageStatus = 'JOINED'

            return
          } else {
            await this.accept()
          }
          return
        }
        const creatorID = this.ephemeral.hash.get('creatorID')
        const creatorUsername = this.ephemeral.hash.get('creatorUsername')
        const who = creatorUsername || creatorID
        const message = who
          ? L('{who} invited you to join their group!', { who })
          : L('You were invited to join')

        this.ephemeral.invitation = {
          groupName: this.ephemeral.hash.get('groupName') ?? L('(group name unavailable)'),
          creatorID,
          creatorUsername,
          message
        }
        this.pageStatus = 'SIGNING'
      } catch (e) {
        console.error(e)
        this.ephemeral.errorMsg = `${L('Something went wrong. Please, try again.')} ${e.message}`
        this.pageStatus = 'INVALID'
      }
    },
    isStatus (status) {
      return this.pageStatus === status
    },
    goHome () {
      this.$router.push({ path: '/' })
    },
    checkAlreadyJoinedGroup (targetGroupId) {
      if (this.ourIdentityContractId) {
        const myGroups = this.$store.state[this.ourIdentityContractId]?.groups || {}
        return myGroups[targetGroupId] && !myGroups[targetGroupId]?.hasLeft
      } else return false
    },
    goToDashboard (toGroupId) {
      if (toGroupId && this.currentGroupId !== toGroupId) {
        sbp('gi.app/group/switch', toGroupId)
      }

      this.$router.push({ path: '/dashboard' })
    },
    async accept () {
      this.ephemeral.errorMsg = null
      const groupId = this.ephemeral.hash.get('groupId')
      const secret = this.ephemeral.hash.get('secret')

      const profileStatus = this.$store.state.contracts[groupId]?.profiles?.[this.ourIdentityContractId]?.status
      if ([PROFILE_STATUS.ACTIVE, PROFILE_STATUS.PENDING].includes(profileStatus)) {
        return this.goToDashboard()
      }
      try {
        await sbp('gi.app/group/joinWithInviteSecret', groupId, secret)
        // this.pageStatus = 'WELCOME'
      } catch (e) {
        console.error('Join.vue accept() error:', e)
        this.ephemeral.errorMsg = e.message

        const alreadyJoinedErr = this.checkAlreadyJoinedGroup(groupId)
        this.pageStatus = alreadyJoinedErr ? 'JOINED' : 'INVALID'
        if (alreadyJoinedErr) {
          // if errored by attempting to join an already-joined group, show a different UI informing it.
          const targetGroupState = this.$store.state[groupId] || {}

          this.ephemeral.groupInfo = {
            name: targetGroupState.settings?.groupName || '',
            id: groupId
          }
        } else {
          sbp('gi.ui/prompt', {
            heading: L('Failed to join the group'),
            question: L('Error details:{br_}{err}', { err: e.message, ...LTags() }),
            primaryButton: L('Close')
          })
        }
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-logo {
  min-width: 8rem;
  width: 8rem;
  margin: auto;

  @include tablet {
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
  }
}

.c-page {
  max-width: 33rem;
  margin: auto;
  height: 100%;
}

.c-welcome {
  margin-top: -1.5rem; // makeup for the default l-page padding-top to respect 100vh
}

.c-header {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;

  .c-title {
    order: 2;
  }

  @include tablet {
    margin-top: 2.5rem;
  }
}

.c-avatars {
  position: relative;
  margin-bottom: 1.5rem;

  .c-avatars-group.is-lg {
    @include tablet {
      width: 8rem;
      height: 8rem;
    }
  }

  .c-avatars-creator {
    position: absolute;
    bottom: 0;
    right: 0;
    border: 2px solid $white;
  }
}

.card {
  padding: 1.5rem 1rem;
  margin-top: 1.5rem;

  @include tablet {
    padding: 2.5rem;
  }
}

.c-switchEnter {
  margin-top: 1.5rem;
  text-align: center;
}

.c-broken,
.c-joined {
  margin-top: 20vh;
  text-align: center;

  .is-title-1 {
    margin-top: 3rem;
    margin-bottom: 0.5rem;
  }

  .c-goHome {
    margin-top: 2rem;
  }
}

@include tablet {
  .c-debug {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
  }
}
</style>
