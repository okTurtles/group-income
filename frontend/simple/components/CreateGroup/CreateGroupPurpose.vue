<template>
  <div>
    <h1><i18n>Group Purpose</i18n></h1>
    <textarea
      class="textarea"
      v-validate
      data-vv-as="Shared Values"
      data-vv-rules="required"
      name="sharedValues"
      :value="value"
      @keyup="(e) => $emit('input', e.target.value)"
    >
    </textarea>
    <p><i18n>Why this group? What is your group about? What connects you?</i18n></p>
  </div>
</template>
<script>
export default {
  name: 'CreateGroupPurpose',
  props: {
    value: {type: String}
  }
}
</script>
