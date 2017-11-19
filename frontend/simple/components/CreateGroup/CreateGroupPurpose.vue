<template>
  <div>
    <h1 class="title is-2 has-text-centered"><i18n>Group Purpose</i18n></h1>
    <div class="field">
      <div class="control">
        <textarea
          class="textarea is-large is-primary"
          placeholder="Group Purpose"
          name="sharedValues"
          required
          :value="group.sharedValues"
          @input="update"
          ref="purpose"
        >
        </textarea>
      </div>
    </div>
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
