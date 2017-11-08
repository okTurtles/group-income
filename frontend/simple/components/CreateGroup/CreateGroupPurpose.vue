<template>
  <div>
    <h1><i18n>Group Purpose</i18n></h1>
    <textarea
      class="textarea"
      v-validate
      data-vv-as="Shared Values"
      data-vv-rules="required"
      name="sharedValues"
      v-model="sharedValues">
    </textarea>
    <p><i18n>Why this group? What is your group about? What connects you?</i18n></p>
    <router-link
      to="new-group-mincome"
    >
      <i18n>Next</i18n>
    </router-link>
  </div>
</template>
<style scoped>
</style>
<script>
export default {
  name: 'CreateGroupPurposeView',
  computed: {
    sharedValues: {
      get () { return this.$store.state.group.sharedValues },
      set (value) { this.$store.commit('updateSharedValues', value) }
    }
  }
}
</script>
