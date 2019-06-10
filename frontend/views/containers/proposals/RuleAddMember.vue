<template lang="pug">
proposal-template(
  :subTitle="L('Change Rule to Add Member')"
  :onSubmit="handleSubmit"
) I step to change rule of add member it's on the way.
</template>

<script>
import ProposalTemplate from './ProposalTemplate.vue'

export default {
  name: 'Mincome',
  components: { ProposalTemplate },
  methods: {
    handleSubmit () {
      console.log('TODO: Logic to Propose a new rule of add member')
    }
  }
}
</script>
