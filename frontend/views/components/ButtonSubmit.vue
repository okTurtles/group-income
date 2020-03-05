<template lang='pug'>
  button.is-loader(
    v-bind='$attrs'
    v-on='bindListeners'
    type='submit'
    :data-loading='ephemeral.isSubmitting'
    :disabled='disabled || ephemeral.isSubmitting'
  )
    slot
</template>

<script>
export default {
  name: 'ButtonSubmit',
  props: {
    disabled: Boolean
  },
  data: () => ({
    ephemeral: {
      isSubmitting: false
    }
  }),
  methods: {
    async submit (e) {
      if (this.ephemeral.isSubmitting) {
        return
      }

      this.ephemeral.isSubmitting = true

      // this.$listeners can await for async events.
      // An advantage over $emit()
      // More at: https://stackoverflow.com/questions/60554270/vuejs-difference-between-emit-and-listeners
      await this.$listeners.click(e)

      this.ephemeral.isSubmitting = false
    }
  },
  computed: {
    bindListeners () {
      return {
        ...this.$listeners,
        // bind passed @click to custom submit fn
        // so it goes through isSubmitting "guard"
        click: this.submit
      }
    }
  }
}
</script>
