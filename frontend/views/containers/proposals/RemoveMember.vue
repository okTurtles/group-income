<template lang="pug">
proposal-template(
  ref='proposal'
  :title='L("Remove Member")'
  :rule='{ value: 7, total: 10 }'
  :maxSteps='config.steps.length'
  :currentStep.sync='ephemeral.currentStep'
  @submit='submit'
)
  .c-step(v-if='ephemeral.currentStep === 0' key='0')
    avatar.c-avatar(:src='member.picture' size='lg')
    i18n.is-title-4(tag='p' :args='{ name: member.name }') Remove {name} from your group

  banner-scoped(ref='formMsg' data-test='proposalError')
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import sbp from '~/shared/sbp.js'
import { CLOSE_MODAL } from '@utils/events.js'
import L from '@view-utils/translations.js'
import Avatar from '@components/Avatar.vue'
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
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'globalProfile',
      'groupShouldPropose'
    ]),
    member () {
      // TODO - add display name if available.
      return this.username ? this.globalProfile(this.username) : {}
    }
  },
  methods: {
    async submit (form) {
      this.$refs.formMsg.clean()
      const username = this.member.name

      if (this.groupShouldPropose) {
        try {
          console.warn('TODO create proposal to remove member')
          // const proposal = await sbp('gi.contracts/group/proposal/create',
          //   {
          //     proposalType: PROPOSAL_REMOVE_MEMBER,
          //     proposalData: {
          //       username,
          //       reason: form.reason
          //     },
          //     votingRule: this.groupSettings.proposals[PROPOSAL_REMOVE_MEMBER].rule,
          //     expires_date_ms: Date.now() + this.groupSettings.proposals[PROPOSAL_REMOVE_MEMBER].expires_ms
          //   },
          //   this.currentGroupId
          // )
          // await sbp('backend/publishLogEntry', proposal)

          // this.ephemeral.currentStep += 1 // Show Success step
        } catch (e) {
          console.error(`Failed proposing to remove member ${username}`, e.message)
          this.$refs.formMsg.danger(L('Failed proposing to remove member. {codeError}', { codeError: e.message }))
          this.ephemeral.currentStep = 0
        }
        return
      }

      try {
        const memberRemoved = await sbp(
          'gi.contracts/group/removeMember/create',
          { username },
          this.currentGroupId
        )
        await sbp('backend/publishLogEntry', memberRemoved)
        this.$refs.proposal.close()
      } catch (e) {
        console.error(`Failed to remove member ${username}`, e.message)
        this.$refs.formMsg.danger(L('Failed to remove member. {codeError}', { codeError: e.message }))
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
