<template lang="pug">
proposal-template(
  title= 'L("Change Rule to Remove Member")'
  footer='L("According to your voting rules, 8 out of 10 members will have to agree with this.")'
  :disabled='$v.form.$invalid || ($v.steps[config.steps[currentStep]] && $v.steps[config.steps[currentStep]].$invalid)'
  :maxSteps='config.steps.length'
  :currentStep.sync='currentStep'
  @submit='submit'
)

  .field(v-if='currentStep === 0' key='0')
    i18n.label(tag='label') I step to change rule of remove member it's on the way

  .field(v-if='currentStep === 1' key='1')
    i18n.label(tag='label') Why are you proposing this change?

    textarea.textarea(
      name='changeReason'
      ref='purpose'
      :placeholder='L("The reason why I\' propositiong this change is...")'
      maxlength='500'
      :class="{ 'error': $v.form.changeReason.$error }"
      v-model='form.changeReason'
    )
</template>

<script>
import ProposalTemplate from './ProposalTemplate.vue'
import { validationMixin } from 'vuelidate'

export default {
  name: 'ProposalRemoveMember',
  components: {
    ProposalTemplate
  },
  mixins: [
    validationMixin
  ],
  data () {
    return {
      v: { type: Object },
      form: {
        changeReason: null
      },
      ephemeral: {
        errorMsg: null,
        // this determines whether or not to render proxy components for tests
        dev: process.env.NODE_ENV === 'development'
      },
      config: {
        steps: [
          'AddMemberRule',
          'ChangeReason'
        ]
      }
    }
  },
  methods: {
    submit () {
      console.log('TODO: Logic to Propose a new rule to change a rule')
    }
  },
  validations: {
    form: {
    },
    // validation groups by route name for steps
    steps: {
      AddMemberRule: [],
      Reason: [
        'form.changeReason'
      ]
    }
  }
}
</script>
