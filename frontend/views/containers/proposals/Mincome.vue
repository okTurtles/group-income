<template lang="pug">
proposal-template(
  :subtitle="L('Change minimum income')"
  :onsubmit='handleSubmit'
)
  | I step to change minimum income it&apos;s on the way.
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
