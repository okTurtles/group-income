<template lang="pug">
proposal-template(
  ref='proposal'
  variant='removeMember'
  :title='L("Remove Member")'
  :maxSteps='config.steps.length'
  :currentStep.sync='ephemeral.currentStep'
  @submit='submit'
)
  .c-step(v-if='ephemeral.currentStep === 0' key='0')
    avatar.c-avatar(:src='memberGlobalProfile.picture' size='lg')
    p.is-title-4.c-descr(data-test='description')
      i18n(:args='{ name: userDisplayName(username) }' v-if='groupShouldPropose') Remove {name} from the group
      i18n(:args='{ name: userDisplayName(username) }' v-else) Are you sure you want to remove {name} from the group?

  banner-scoped(ref='formMsg' data-test='proposalError')
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import sbp from '~/shared/sbp.js'
import { CLOSE_MODAL, SET_MODAL_QUERIES } from '@utils/events.js'
import Avatar from '@components/Avatar.vue'
import { PROPOSAL_REMOVE_MEMBER } from '@model/contracts/voting/constants.js'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ProposalTemplate from './ProposalTemplate.vue'

export default ({
  name: 'RemoveMember',
  components: {
    Avatar,
    BannerScoped,
    ProposalTemplate
  },
  data () {
    return {
      username: null,
      ephemeral: {
        currentStep: 0
      },
      config: {
        steps: [
          'RemoveMember'
        ]
      }
    }
  },
  created () {
    const username = this.$route.query.username
    const isPartOfGroup = this.groupProfiles[username]

    if (username) {
      sbp('okTurtles.events/emit', SET_MODAL_QUERIES, 'RemoveMember', { username })
    }
    if (isPartOfGroup) {
      this.username = username
    } else {
      console.warn('RemoveMember: Missing valid query "username".')
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'currentGroupState',
      'globalProfile',
      'groupProfiles',
      'groupSettings',
      'groupShouldPropose',
      'groupMembersCount',
      'ourUsername',
      'userDisplayName'
    ]),
    memberGlobalProfile () {
      return this.globalProfile(this.username) || {}
    }
  },
  methods: {
    async submit (form) {
      this.$refs.formMsg.clean()
      const member = this.username

      if (this.groupShouldPropose) {
        try {
          await sbp('gi.actions/group/proposal', {
            contractID: this.currentGroupId,
            data: {
              proposalType: PROPOSAL_REMOVE_MEMBER,
              proposalData: {
                member,
                reason: form.reason
              },
              votingRule: this.groupSettings.proposals[PROPOSAL_REMOVE_MEMBER].rule,
              expires_date_ms: Date.now() + this.groupSettings.proposals[PROPOSAL_REMOVE_MEMBER].expires_ms
            }
          })
          this.ephemeral.currentStep += 1
        } catch (e) {
          console.error('RemoveMember submit() error:', member, e)
          this.$refs.formMsg.danger(e.message)

          this.ephemeral.currentStep = 0
        }
        return
      }

      try {
        await sbp('gi.actions/group/removeMember', {
          contractID: this.currentGroupId, data: { member }
        })
        this.$refs.proposal.close()
      } catch (e) {
        console.error('Failed to remove member %s:', member, e.message)
        this.$refs.formMsg.danger(e.message)
      }
    }
  }
}: Object)
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-step {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 0.5rem;

  // BUG on VUE? - without nesting it doesn't work
  .c-avatar {
    margin-bottom: 1rem;
  }
}

.c-descr {
  text-align: center;
}
</style>
