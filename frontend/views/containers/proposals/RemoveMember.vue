<template lang="pug">
proposal-template(
  ref='proposal'
  variant='removeMember'
  :title='L("Remove Member")'
  :maxSteps='config.steps.length'
  :currentStep.sync='ephemeral.currentStep'
  :shouldImmediateChange='form.usePermission'
  @submit='submit'
)
  .c-step(v-if='ephemeral.currentStep === 0' key='0')
    avatar.c-avatar(:src='memberGlobalProfile.picture' size='lg')

    p.is-title-4.c-descr(data-test='description')
      i18n(:args='{ name: userDisplayNameFromID(memberID) }' v-if='groupShouldPropose') Remove {name} from the group
      i18n(:args='{ name: userDisplayNameFromID(memberID) }' v-else) Are you sure you want to remove {name} from the group?

    label.checkbox.c-use-admin-permissions(v-if='groupShouldPropose && hasPermissionsToRemoveMember')
      input.input(type='checkbox' v-model='form.usePermission')
      i18n Use permissions to remove immediately

  banner-scoped(ref='formMsg' data-test='proposalError')
</template>

<script>
import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import { CLOSE_MODAL, SET_MODAL_QUERIES } from '@utils/events.js'
import Avatar from '@components/Avatar.vue'
import { PROPOSAL_REMOVE_MEMBER, GROUP_PERMISSIONS } from '@model/contracts/shared/constants.js'
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
      memberID: null,
      ephemeral: {
        currentStep: 0
      },
      form: {
        usePermission: false
      },
      config: {
        steps: [
          'RemoveMember'
        ]
      }
    }
  },
  created () {
    const memberID = this.$route.query.memberID
    const isPartOfGroup = this.groupProfiles[memberID]

    if (memberID) {
      sbp('okTurtles.events/emit', SET_MODAL_QUERIES, 'RemoveMember', { memberID })
    }
    if (isPartOfGroup) {
      this.memberID = memberID
    } else {
      console.warn('RemoveMember: Missing valid query "memberID".')
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
      'userDisplayNameFromID',
      'ourGroupPermissionsHas'
    ]),
    memberGlobalProfile () {
      return this.globalProfile(this.memberID) || {}
    },
    hasPermissionsToRemoveMember () {
      return this.ourGroupPermissionsHas(GROUP_PERMISSIONS.REMOVE_MEMBER)
    }
  },
  methods: {
    async submit (form) {
      this.$refs.formMsg.clean()
      const memberID = this.memberID

      if (this.groupShouldPropose && !this.form.usePermission) {
        try {
          await sbp('gi.actions/group/proposal', {
            contractID: this.currentGroupId,
            data: {
              proposalType: PROPOSAL_REMOVE_MEMBER,
              proposalData: {
                memberID,
                reason: form.reason
              },
              votingRule: this.groupSettings.proposals[PROPOSAL_REMOVE_MEMBER].rule,
              expires_date_ms: Date.now() + this.groupSettings.proposals[PROPOSAL_REMOVE_MEMBER].expires_ms
            }
          })
          this.ephemeral.currentStep += 1
        } catch (e) {
          console.error('RemoveMember submit() error:', memberID, e)
          this.$refs.formMsg.danger(e.message)

          this.ephemeral.currentStep = 0
        }
        return
      }

      try {
        await sbp('gi.actions/group/removeMember', {
          contractID: this.currentGroupId, data: { memberID }
        })
        this.$refs.proposal.close()
      } catch (e) {
        console.error(`Failed to remove member ${memberID}:`, e.message)
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

.c-use-admin-permissions {
  margin-top: 0.5rem;
  margin-bottom: 1.25rem;
  margin-right: 0;
}
</style>
