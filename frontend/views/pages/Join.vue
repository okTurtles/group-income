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
import { L } from '@common/common.js'
import Avatar from '@components/Avatar.vue'
import Loading from '@components/Loading.vue'
import LoginForm from '@containers/access/LoginForm.vue'
import SignupForm from '@containers/access/SignupForm.vue'
import sbp from '@sbp/sbp'
import SvgBrokenLink from '@svgs/broken-link.svg'
import { LOGIN } from '@utils/events.js'
import { mapGetters, mapState } from 'vuex'
import { INVITE_STATUS } from '~/shared/domains/chelonia/constants.js'
import { PROFILE_STATUS } from '@model/contracts/shared/constants.js'
// Using relative path to crypto.js instead of ~-path to workaround some esbuild bug
import { keyId } from '../../../shared/domains/chelonia/crypto.js'

let syncFinished = false
sbp('okTurtles.events/once', LOGIN, () => { syncFinished = true })

export default ({
  name: 'Join',
  components: {
    Loading,
    LoginForm,
    SignupForm,
    Avatar,
    SvgBrokenLink
  },
  data () {
    return {
      ephemeral: {
        pageStatus: 'LOADING',
        invitation: {},
        query: null
      }
    }
  },
  computed: {
    ...mapGetters(['ourUsername']),
    ...mapState(['currentGroupId']),
    pageStatus: {
      get () { return this.ephemeral.pageStatus },
      set (status) {
        const possibleStatus = ['LOADING', 'SIGNING', 'LOGGING', 'INVALID', 'EXPIRED']
        if (!possibleStatus.includes(status)) {
          throw new Error(`Bad status: ${status}. Use one of the following: ${possibleStatus.join(', ')}`)
        }
        this.ephemeral.pageStatus = status
      }
    }
  },
  mounted () {
    // For some reason in some Cypress tests it loses the route query when initialized is called
    this.ephemeral.query = this.$route.query
    if (syncFinished || !this.ourUsername) {
      this.initialize()
    } else {
      sbp('okTurtles.events/once', LOGIN, () => this.initialize())
    }
  },
  methods: {
    async initialize () {
      try {
        const state = await sbp('chelonia/latestContractState', this.ephemeral.query.groupId)
        const publicKeyId = keyId(this.ephemeral.query.secret)
        const invite = state._vm.invites[publicKeyId]
        if (invite?.expires < Date.now()) {
          console.log('Join.vue error: Link is already expired.')
          this.ephemeral.errorMsg = L('You should ask for a new one. Sorry about that!')
          this.pageStatus = 'EXPIRED'
          return
        } else if (invite?.initialQuantity > 0 && !invite.quantity) {
          console.log('Join.vue error: Link is already expired.')
          this.ephemeral.errorMsg = L('You should ask for a new one. Sorry about that!')
          this.pageStatus = 'EXPIRED'
          return
        } if (invite?.status !== INVITE_STATUS.VALID) {
          console.error('Join.vue error: Link is not valid.')
          this.ephemeral.errorMsg = L('You should ask for a new one. Sorry about that!')
          this.pageStatus = 'INVALID'
          return
        }
        if (this.ourUsername) {
          if (this.currentGroupId && [PROFILE_STATUS.ACTIVE, PROFILE_STATUS.PENDING].includes(this.$store.state.contracts[this.ephemeral.query.groupId]?.profiles?.[this.ourUsername])) {
            this.$router.push({ path: '/dashboard' })
          } else {
            await this.accept()
          }
          return
        }
        const creator = this.ephemeral.query.creator
        const message = creator
          ? L('{who} invited you to join their group!', { who: creator })
          : L('You were invited to join')

        this.ephemeral.invitation = {
          groupName: this.ephemeral.query.groupName ?? L('(group name unavailable)'),
          creator,
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
    async accept () {
      this.ephemeral.errorMsg = null
      const { groupId, secret } = this.ephemeral.query
      if ([PROFILE_STATUS.ACTIVE, PROFILE_STATUS.PENDING].includes(this.$store.state.contracts[groupId]?.profiles?.[this.ourUsername]?.status)) {
        return this.$router.push({ path: '/dashboard' })
      }
      try {
        const identityContractID = this.$store.state.loggedIn.identityContractID

        await sbp('gi.actions/identity/joinGroup', {
          contractID: identityContractID,
          contractName: 'gi.contracts/identity',
          data: {
            groupContractID: groupId,
            inviteSecret: secret
          }
        }).then(() => {
          return sbp('gi.actions/group/switch', groupId)
        })
        this.$router.push({ path: '/pending-approval' })
      } catch (e) {
        console.error('Join.vue accept() error:', e)
        this.ephemeral.errorMsg = e.message
        this.pageStatus = 'INVALID'
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

.c-broken {
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
