<template>
  <proposal-template
    :subTitle="L('Change Rule to Add Member')"
    :onSubmit="handleSubmit">
    I step to change rule of add member it's on the way.
  </proposal-template>
</template>
<script>
import ProposalTemplate from './ProposalTemplate.vue'
import { mixinL } from '../../utils/mixins.js'

export default {
  name: 'Mincome',
  mixins: [
    mixinL
  ],
  components: { ProposalTemplate },
  methods: {
    handleSubmit () {
      console.log('TODO: Logic to Propose a new rule of add member')
    }
  }
}
</script>
