<template>
  <proposal-template
    :subTitle="L('Change minimum income')"
    :onSubmit="handleSubmit">
    I step to change minimum income it's on the way.
  </proposal-template>
</template>
<script>
import ProposalTemplate from './ProposalTemplate.vue'

export default {
  name: 'Mincome',
  components: { ProposalTemplate },
  methods: {
    handleSubmit () {
      console.log('TODO: Logic to Propose a new mincome')
    }
  }
}
</script>
