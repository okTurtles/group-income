<template>
  <proposal-template
    :subTitle="L('Change Rule to change Rule')"
    :onSubmit="handleSubmit">
    I step to change rule of change rule it's on the way
  </proposal-template>
  </div>
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
      console.log('TODO: Logic to Propose a new rule to change a rule')
    }
  }
}
</script>
