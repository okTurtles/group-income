<template>
  <div>
    <h1><i18n>Name Your Group</i18n></h1>
    <input
      type="text"
      v-validate
      data-vv-as="Group Name"
      data-vv-rules="required"
      name="groupName"
      v-model="groupName"
      class="input"
    >
    <p><i18n>This is some help text to give ideas on what kind of group you're creating</i18n></p>
    <a href="#">Next</a>
  </div>
</template>
<style scoped>
</style>
<script>
export default {
  name: 'CreateGroupNameView',
  computed: {
    groupName: {
      get () { return this.$store.state.group.groupName },
      set (value) { this.$store.commit('updateGroupName', value) }
    }
  }
}
</script>
