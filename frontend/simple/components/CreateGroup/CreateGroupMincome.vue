<template>
  <div>
    <h1 class="title is-2 has-text-centered"><i18n>Minimum Income</i18n></h1>
    <div class="field">
      <div class="control">
        <input
          class="input is-large is-primary"
          placeholder="Amount"
          name="incomeProvided"
          type="number"
          step="1"
          min="0"
          required
          :value="group.incomeProvided"
          @input="update"
          ref="mincome"
        />
      </div>
    </div>
    <p><i18n>How much income would you like your group to provide?</i18n></p>
  </div>
</template>
<script>
export default {
  name: 'CreateGroupMincome',
  props: {
    group: {type: Object}
  },
  mounted () {
    this.$refs.mincome.focus()
  },
  methods: {
    update (e) {
      this.$emit('input', {
        data: {
          incomeProvided: e.target.value
        },
        validity: {
          incomeProvided: e.target.validity.valid
        }
      })
    }
  }
}
</script>
