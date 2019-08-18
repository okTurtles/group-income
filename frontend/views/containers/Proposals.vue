<template lang="pug">
.c-proposals
  proposal-box(
    v-for='(proposal, hash) in currentGroupState.proposals'
    :key='hash'
    :proposalHash='hash'
  )
</template>

<script>
import ProposalBox from '@components/Proposals/ProposalBox.vue'
import { mapGetters } from 'vuex'

export default {
  name: 'Proposals',
  components: {
    ProposalBox
  },
  data () {
    return {
      ephemeral: {
      }
    }
  },
  computed: {
    ...mapGetters([
      'currentGroupState'
    ])

  },
  methods: {
  }
}
</script>

<style lang="scss" scoped>
.c-proposals {
}
</style>
