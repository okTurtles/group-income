<template>
  <div>
    <h1><i18n>Name Your Group</i18n></h1>
    <input
      type="text"
      required
      name="groupName"
      class="input"
      :value="group.groupName"
      @keyup="update"
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
  },
  methods: {
    update (e) {
      this.$emit('input', {
        data: {
          groupName: e.target.value
        },
        validity: {
          groupName: e.target.validity.valid
        }
      })
    }
  }
}
</script>
