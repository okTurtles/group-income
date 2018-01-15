<template>
  <div>
    <h1 class="title is-2 has-text-centered"><i18n>Group Purpose</i18n></h1>
    <div class="field">
      <div class="control">
        <textarea
          class="textarea is-large is-primary"
          :class="{ 'is-danger': v.sharedValues.$error }"
          placeholder="Group Purpose"
          name="sharedValues"
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
    group: {type: Object},
    v: {type: Object}
  },
  mounted () {
    this.$refs.purpose.focus()
  },
  methods: {
    update (e) {
      this.v.sharedValues.$touch()
      this.$emit('input', {
        data: {
          sharedValues: e.target.value
        }
      })
    }
  }
}
</script>
