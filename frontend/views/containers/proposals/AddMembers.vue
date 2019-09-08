<template lang='pug'>
  proposal-template(
    :title='L("Add new members")'
    :rule='{ value: 5, total: 10 }'
    :disabled='$v.form.$invalid || ($v.steps[config.steps[ephemeral.currentStep]] && $v.steps[config.steps[ephemeral.currentStep]].$invalid)'
    :maxSteps='config.steps.length'
    :currentStep.sync='ephemeral.currentStep'
    @submit='submit'
  )
    // | TBD in another task
    // | https://github.com/okTurtles/group-income-simple/issues/609
    div(v-if='currentStep === 0' key='0')
      label.field
        i18n.label Username
        .input-combo
          input.input(
            type='text'
            name='mincome'
            required=''
            :class="{ 'error': $v.form.member.$error }"
            v-model='form.member'
            @keyup.enter='next'
          )
      button.link.c-addMember(
        @click="addNewMember"
      )
        i.icon-plus
        i18n Add more people
      // invite
</template>

<script>
import Invite from '@pages/Invite.vue'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import ProposalTemplate from './ProposalTemplate.vue'

export default {
  name: 'AddMembers',
  components: {
    Invite,
    ProposalTemplate
  },
  mixins: [
    validationMixin
  ],
  data () {
    return {
      form: {
        member: null
      },
      ephemeral: {
        currentStep: 0,
        errorMsg: null
      },
      config: {
        steps: [
          'Member'
        ]
      }
    }
  },
  validations: {
    form: {
      member: {
        required
      }
    },
    // validation groups by route name for steps
    steps: {
      Member: [
        'form.member'
      ]
    }
  },
  methods: {
    submit (form) {
      console.log(
        'TODO: Logic to Propose Mincome.',
        'mincome:', this.form.member,
        'reason:', form.reason
      )
    }
  }
}
</script>
<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-addMember {
  margin-top: $spacer;

  .icon-plus {
    margin-right: $spacer-sm;
  }
}
</style>
