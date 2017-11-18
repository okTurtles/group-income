<template>
  <div>
    <h1><i18n>Group Advanced Rules</i18n></h1>
    <p><i18n>What percentage approval is necessary to adjust the group rules?</i18n></p>
    <p class="title is-3 percentage">{{ group.changePercentage }}%</p>
    <input
      type="range"
      min="1"
      max="100"
      name="changePercentage"
      :value="group.changePercentage"
      @input="update"
      ref="changePercentage"
    >
    <p class="title is-3">{{ group.memberApprovalPercentage }}%</p>
    <input
      type="range"
      min="1"
      max="100"
      name="memberApprovalPercentage"
      :value="group.memberApprovalPercentage"
      @input="update"
    >
    <p class="title is-3">{{ group.memberRemovalPercentage }}%</p>
    <input
      type="range"
      min="1"
      max="100"
      name="memberRemovalPercentage"
      :value="group.memberRemovalPercentage"
      @input="update"
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
  },
  methods: {
    update (e) {
      this.$emit('input', {
        data: {
          [e.target.name]: parseInt(e.target.value)
        },
        validity: {
          [e.target.name]: e.target.validity.valid
        }
      })
    }
  }
}
</script>
