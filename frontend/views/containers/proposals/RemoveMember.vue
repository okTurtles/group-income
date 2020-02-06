<template lang="pug">
proposal-template(
  :title='L("Remove Member")'
  :rule='{ value: 7, total: 10 }'
  :maxSteps='config.steps.length'
  :currentStep.sync='ephemeral.currentStep'
  @submit='submit'
)
  .c-step(v-if='ephemeral.currentStep === 0' key='0')
    avatar.c-avatar(:src='member.picture' size='lg')
    i18n.is-title-4(tag='p' :args='{ name: member.displayName || member.name }') Remove {name} from your group
</template>

<script>
import { mapGetters } from 'vuex'
import sbp from '~/shared/sbp.js'
import { CLOSE_MODAL } from '@utils/events.js'
import Avatar from '@components/Avatar.vue'
import ProposalTemplate from './ProposalTemplate.vue'

export default {
  name: 'RemoveMember',
  components: {
    Avatar,
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
    ...mapGetters([
      'globalProfile'
    ]),
    member () {
      // TODO - add display name if available.
      return this.username ? this.globalProfile(this.username) : {}
    }
  },
  methods: {
    submit (form) {
      console.log(
        'TODO: Logic to Propose removing a member.',
        'member:', this.username,
        'reason:', form && form.reason
      )
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
