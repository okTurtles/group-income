<template lang="pug">
proposal-template(
  :title='L("Remove Member")'
  :rule='{ value: 7, total: 10 }'
  :maxSteps='config.steps.length'
  :currentStep.sync='ephemeral.currentStep'
  @submit='submit'
)
  .c-step(v-if='ephemeral.currentStep === 0' key='0')
    avatar.c-avatar(:src='member.picture')
    i18n.is-title-4(tag='p' :args='{ name: member.displayName || member.name }') Remove {name} from your group
</template>

<script>
import Avatar from '@components/Avatar.vue'
import ProposalTemplate from './ProposalTemplate.vue'

export default {
  name: 'RemoveMember',
  components: {
    Avatar,
    ProposalTemplate
  },
  data () {
    return {
      ephemeral: {
        currentStep: 0
      },
      config: {
        steps: [
          'AddMemberRule'
        ]
      }
    }
  },
  created () {
    console.log('TODO - Get username info')
  },
  computed: {
    member () {
      // TODO - connect to real store.
      return {
        id: 1000,
        displayName: '[Attila the Hun]',
        picture: '/assets/images/default-avatar.png'
      }
    }
  },
  methods: {
    submit (form) {
      console.log(
        'TODO: Logic to Propose removing a member.',
        'member:', 'DUMMY',
        'reason:', form.reason
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
    width: 5rem;
    height: 5rem;
    margin-bottom: $spacer;
  }
}
</style>
