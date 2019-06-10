<template lang="pug">
proposal-template(
  :subTitle="L('Change Rule to change Rule')"
  :onSubmit="handleSubmit"
) I step to change rule of change rule it's on the way

</template>

<script>
import ProposalTemplate from './ProposalTemplate.vue'

export default {
  name: 'Mincome',
  components: { ProposalTemplate },
  methods: {
    handleSubmit () {
      console.log('TODO: Logic to Propose a new rule to change a rule')
    }
  }
}
</script>
