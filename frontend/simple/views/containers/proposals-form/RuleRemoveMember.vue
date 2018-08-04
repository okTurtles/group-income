<template>
  <proposal-template
    :subTitle="L('Change Rule to Remove Member')"
    :onSubmit="handleSubmit">
    I step to change rule of remove member it's on the way
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
      console.log('TODO: Logic to Propose a new rule of remove member')
    }
  }
}
</script>
