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
          @keyup="ignore"
          maxlength="500"
        >
        </textarea>
      </div>
    </div>
    <p><i18n>Why this group? What is your group about? What connects you?</i18n></p>
  </div>
</template>
<script>
export default {
  name: 'GroupPurpose',
  props: {
    group: {type: Object},
    v: {type: Object}
  },
  mounted () {
    this.$refs.purpose.focus()
    document.addEventListener('keyup', this.next)
  },
  beforeDestroy () {
    document.removeEventListener('keyup', this.next)
  },
  methods: {
    update (e) {
      this.v.sharedValues.$touch()
      this.$emit('input', {
        data: {
          sharedValues: e.target.value
        }
      })
    },
    ignore (e) {
      e.preventDefault()
      e.stopImmediatePropagation()
    },
    next (e) {
      if (this.group.sharedValues && e.keyCode === 13) {
        this.$emit('next')
      }
    }
  }
}
</script>
