<template lang='pug'>
  proposal-template(
    :title='L("Add new members")'
    :rule='{ value: 5, total: 10 }'
    :disabled='$v.form.$invalid || ($v.steps[config.steps[currentStep]] && $v.steps[config.steps[currentStep]].$invalid)'
    :maxSteps='config.steps.length'
    :currentStep.sync='currentStep'
    @submit='submit'
  )
    div(v-if='currentStep === 0' key='0')
      label.field
        i18n.label Username
        .input-combo
          input.input(
            type='text'
            placeholder='Jack Mars'
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
        | Add more people

      // | TBD in another task
      // | https://github.com/okTurtles/group-income-simple/issues/609
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
      currentStep: 0,
      v: { type: Object },
      form: {
        member: null
      },
      ephemeral: {
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
