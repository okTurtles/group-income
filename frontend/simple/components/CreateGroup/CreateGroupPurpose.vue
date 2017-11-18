<template>
  <div>
    <h1><i18n>Group Purpose</i18n></h1>
    <textarea
      class="textarea"
      required
      name="sharedValues"
      :value="group.sharedValues"
      @keyup="update"
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
  },
  methods: {
    update (e) {
      this.$emit('input', {
        data: {
          sharedValues: e.target.value
        },
        validity: {
          sharedValues: e.target.validity.valid
        }
      })
    }
  }
}
</script>
