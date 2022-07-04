<template lang='pug'>
ul.c-proposals(data-test='proposalsWidget')
  proposal-item(v-for='hash in proposalHashes' :key='hash' :proposalHash='hash')
</template>

<script>
import ProposalItem from './ProposalItem.vue'

export default ({
  name: 'ProposalBox',
  props: {
    proposalHashes: Array // [hash1, hash2, ...]
  },
  components: {
    ProposalItem
  }
}: Object)
</script>
