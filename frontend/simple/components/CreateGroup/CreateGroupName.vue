<template>
  <div>
    <h1><i18n>Name Your Group</i18n></h1>
    <input
      type="text"
      v-validate
      data-vv-as="Group Name"
      data-vv-rules="required"
      name="groupName"
      class="input"
      :value="group.groupName"
      @keyup="(e) => $emit('input', { groupName: e.target.value })"
      ref="name"
    >
    <p><i18n>This is some help text to give ideas on what kind of group you're creating</i18n></p>
  </div>
</template>
<script>
export default {
  name: 'CreateGroupName',
  props: {
    group: {type: Object}
  },
  mounted () {
    this.$refs.name.focus()
  }
}
</script>
