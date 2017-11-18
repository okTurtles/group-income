<template>
  <div>
    <h1><i18n>Group Advanced Rules</i18n></h1>
    <p><i18n>What percentage approval is necessary to adjust the group rules?</i18n></p>
    <p class="title is-3 percentage">{{ group.changePercentage }}%</p>
    <input
      type="range"
      v-validate
      data-vv-as="Percentage to change rules"
      data-vv-rules="between:1,100"
      min="0"
      max="100"
      name="changePercentage"
      :value="group.changePercentage"
      @input="(e) => $emit('input', { changePercentage: parseInt(e.target.value) })"
      ref="changePercentage"
    >
    <p class="title is-3">{{ group.memberApprovalPercentage }}%</p>
    <input
      type="range"
      min="0"
      max="100"
      data-vv-as="Member Approval Percentage"
      v-validate
      data-vv-rules="between:1,100"
      name="memberApprovalPercentage"
      :value="group.memberApprovalPercentage"
      @input="(e) => $emit('input', { memberApprovalPercentage: parseInt(e.target.value) })"
    >
    <p class="title is-3">{{ group.memberRemovalPercentage }}%</p>
    <input
      type="range"
      min="0"
      max="100"
      data-vv-as="Member Removal Percentage"
      v-validate
      data-vv-rules="between:1,100"
      name="memberRemovalPercentage"
      :value="group.memberRemovalPercentage"
      @input="(e) => $emit('input', { memberRemovalPercentage: parseInt(e.target.value) })"
    >
    </textarea>
  </div>
</template>
<script>
export default {
  name: 'CreateGroupRules',
  props: {
    group: {type: Object}
  },
  mounted () {
    this.$refs.changePercentage.focus()
  }
}
</script>
