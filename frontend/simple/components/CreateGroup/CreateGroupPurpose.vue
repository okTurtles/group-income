<template>
  <div>
    <h1><i18n>Group Purpose</i18n></h1>
    <textarea
      class="textarea"
      v-validate
      data-vv-as="Shared Values"
      data-vv-rules="required"
      name="sharedValues"
      :value="group.sharedValues"
      @keyup="(e) => $emit('input', { sharedValues: e.target.value })"
      ref="purpose"
    >
    </textarea>
    <p><i18n>Why this group? What is your group about? What connects you?</i18n></p>
  </div>
</template>
<script>
export default {
  name: 'CreateGroupPurpose',
  props: {
    group: {type: Object}
  },
  mounted () {
    this.$refs.purpose.focus()
  }
}
</script>
