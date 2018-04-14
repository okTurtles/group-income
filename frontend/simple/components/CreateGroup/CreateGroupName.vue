<template>
  <div>
    <h1 class="title is-2 has-text-centered"><i18n>Name Your Group</i18n></h1>
    <div class="field">
      <div class="control">
        <input
          class="input is-large is-primary"
          :class="{ 'is-danger': v.groupName.$error }"
          placeholder="Group Name"
          name="groupName"
          type="text"
          :value="group.groupName"
          @input="update"
          ref="name"
          data-test="groupName"
        >
      </div>
    </div>
    <p><i18n>This is some help text to give ideas on what kind of group you're creating</i18n></p>
  </div>
</template>
<script>
export default {
  name: 'CreateGroupName',
  props: {
    group: {type: Object},
    v: {type: Object}
  },
  mounted () {
    this.$refs.name.focus()
  },
  methods: {
    update (e) {
      this.v.groupName.$touch()
      this.$emit('input', {
        data: {
          groupName: e.target.value
        }
      })
    }
  }
}
</script>
