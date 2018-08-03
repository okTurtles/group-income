<template>
  <proposal-template
    :subTitle="L('Change minimum income')"
    :onSubmit="handleSubmit">
    I step to change minimum income it's on the way.
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
      console.log('TODO: Logic to Propose a new mincome')
    }
  }
}
</script>
