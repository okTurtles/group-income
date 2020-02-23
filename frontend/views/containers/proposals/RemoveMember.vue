<template lang="pug">
proposal-template(
  ref='proposal'
  variant='removeMember'
  :title='L("Remove Member")'
  :rule='rule'
  :maxSteps='config.steps.length'
  :currentStep.sync='ephemeral.currentStep'
  @submit='submit'
)
  .c-step(v-if='ephemeral.currentStep === 0' key='0')
    avatar.c-avatar(:src='memberGlobalProfile.picture' size='lg')
    p.is-title-4(data-test='description')
      i18n(:args='{ name: userDisplayName(username) }' v-if='groupShouldPropose') Remove {name} from the group
      i18n(:args='{ name: userDisplayName(username) }' v-else) Are you sure you want to remove {name} from the group?

  banner-scoped(ref='formMsg' data-test='proposalError')
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import sbp from '~/shared/sbp.js'
import { CLOSE_MODAL } from '@utils/events.js'
import L from '@view-utils/translations.js'
import Avatar from '@components/Avatar.vue'
import { PROPOSAL_REMOVE_MEMBER } from '@model/contracts/voting/proposals.js'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ProposalTemplate from './ProposalTemplate.vue'

export default {
  name: 'RemoveMember',
  components: {
    Avatar,
    BannerScoped,
    ProposalTemplate
  },
  props: {
    username: String
  },
  data () {
    return {
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
    if (!this.username) {
      console.warn('Missing username to display RemoveMember modal')
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
    },
    rule () {
      const { threshold } = this.groupSettings.proposals['remove-member'].ruleSettings.threshold
      return { value: Math.round(this.groupMembersCount * threshold), total: this.groupMembersCount }
    }
  },
  methods: {
    async submit (form) {
      this.$refs.formMsg.clean()
      const member = this.username
      const memberId = this.groupProfiles[member].contractID

      if (this.groupShouldPropose) {
        try {
          const data = {
            proposalType: PROPOSAL_REMOVE_MEMBER,
            proposalData: {
              member,
              memberId,
              groupId: this.currentGroupId,
              reason: form.reason
            },
            votingRule: this.groupSettings.proposals[PROPOSAL_REMOVE_MEMBER].rule,
            expires_date_ms: Date.now() + this.groupSettings.proposals[PROPOSAL_REMOVE_MEMBER].expires_ms
          }
          const proposal = await sbp('gi.contracts/group/proposal/create',
            data,
            this.currentGroupId
          )
          await sbp('backend/publishLogEntry', proposal)

          this.ephemeral.currentStep += 1
        } catch (e) {
          console.error(`Failed to propose remove ${member}.`, e)
          this.$refs.formMsg.danger(L('Failed to propose remove {member}: {codeError}', { codeError: e.message, member }))

          this.ephemeral.currentStep = 0
        }

        return
      }

      try {
        await sbp('gi.actions/group/removeMember', {
          member,
          memberId,
          groupId: this.currentGroupId
        }, this.currentGroupId)
        this.$refs.proposal.close()
      } catch (e) {
        console.error(`Failed to remove member ${member}.`, e)
        this.$refs.formMsg.danger(e.message)
      }
    }
  }
}
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-step {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: $spacer-sm;

  // BUG on VUE? - without nesting it doesn't work
  .c-avatar {
    margin-bottom: $spacer;
  }
}
</style>
