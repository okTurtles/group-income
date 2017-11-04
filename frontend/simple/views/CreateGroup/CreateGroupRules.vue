<template>
  <div>
    <h1><i18n>Group Advanced Rules</i18n></h1>
    <p><i18n>What percentage approval is necessary to adjust the group rules?</i18n></p>
    <p class="title is-3 percentage">{{ changePercentage }}%</p>
    <input
      type="range"
      v-validate
      data-vv-as="Percentage to change rules"
      data-vv-rules="between:1,100"
      min="0"
      max="100"
      name="changePercentage"
      v-model="changePercentage"
    >
    <p class="title is-3">{{ memberApprovalPercentage }}%</p>
    <input
      type="range"
      min="0"
      max="100"
      data-vv-as="Member Approval Percentage"
      v-validate
      data-vv-rules="between:1,100"
      name="memberApprovalPercentage"
      v-model="memberApprovalPercentage"
    >
    <p class="title is-3">{{ memberRemovalPercentage }}%</p>
    <input
      type="range"
      min="0"
      max="100"
      data-vv-as="Member Removal Percentage"
      v-validate
      data-vv-rules="between:1,100"
      name="memberRemovalPercentage"
      v-model="memberRemovalPercentage"
    >
    </textarea>
    <router-link
      to="new-group"
    >
      <!-- TODO: to next step instead -->
      <i18n>Next</i18n>
    </router-link>
  </div>
</template>
<style scoped>
</style>
<script>
export default {
  name: 'CreateGroupRulesView',
  computed: {
    changePercentage: {
      get () { return this.$store.state.group.changePercentage },
      set (value) { this.$store.commit('updateChangePercentage', value) }
    },
    memberApprovalPercentage: {
      get () { return this.$store.state.group.memberApprovalPercentage },
      set (value) { this.$store.commit('updateMemberApprovalPercentage', value) }
    },
    memberRemovalPercentage: {
      get () { return this.$store.state.group.memberRemovalPercentage },
      set (value) { this.$store.commit('updateMemberRemovalPercentage', value) }
    }
  }
}
</script>
