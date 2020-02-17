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
    i18n.is-title-4(tag='p' :args='{ name: userDisplayName(username) }' v-if='groupShouldPropose') Remove {name} from your group
    i18n.is-title-4(tag='p' :args='{ name: userDisplayName(username) }' v-else) Are you sure you want to remove {name} from your group?

  banner-scoped(ref='formMsg' data-test='proposalError')
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import sbp from '~/shared/sbp.js'
import { CLOSE_MODAL } from '@utils/events.js'
import L from '@view-utils/translations.js'
import Avatar from '@components/Avatar.vue'
import { PROPOSAL_REMOVE_MEMBER, STATUS_OPEN } from '@model/contracts/voting/proposals.js'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ProposalTemplate from './ProposalTemplate.vue'
import { validateRemoveMember } from '@model/contracts/group.js'

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
    validateRemoval (data) {
      return validateRemoveMember(this.currentGroupState, {
        data,
        meta: { username: this.ourUsername }
      })
    },
    async submit (form) {
      this.$refs.formMsg.clean()
      const member = this.username
      const memberID = this.groupProfiles[member].contractID

      if (this.groupShouldPropose) {
        // Look for existing proposal
        for (const hash in this.currentGroupState.proposals) {
          const prop = this.currentGroupState.proposals[hash]
          if (prop.status === STATUS_OPEN &&
            prop.data.proposalType === PROPOSAL_REMOVE_MEMBER &&
            prop.data.proposalData.member === member
          ) {
            console.error('Duplicated proposal.')
            this.$refs.formMsg.danger(L('There is already an open proposal to remove this member.'))
            this.ephemeral.currentStep = 0
            return
          }
        }

        try {
          const data = {
            proposalType: PROPOSAL_REMOVE_MEMBER,
            proposalData: {
              member,
              memberID,
              groupID: this.currentGroupId,
              reason: form.reason
            },
            votingRule: this.groupSettings.proposals[PROPOSAL_REMOVE_MEMBER].rule,
            expires_date_ms: Date.now() + this.groupSettings.proposals[PROPOSAL_REMOVE_MEMBER].expires_ms
          }
          this.validateRemoval(data.proposalData)
          const proposal = await sbp('gi.contracts/group/proposal/create',
            data,
            this.currentGroupId
          )
          await sbp('backend/publishLogEntry', proposal)

          this.ephemeral.currentStep += 1 // Show Success step
        } catch (e) {
          console.error(`Failed proposing to remove member ${member}.`, e.message)
          this.$refs.formMsg.danger(L('Failed proposing to remove member. {codeError}', { codeError: e.message }))
          this.ephemeral.currentStep = 0
        }

        return
      }

      try {
        await sbp('gi.actions/group/removeMember', {
          member,
          memberID,
          groupID: this.currentGroupId
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
