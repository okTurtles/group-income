<template>
  <div>
    <h1><i18n>Minimum Income</i18n></h1>
    <input
      class="input"
      type="text"
      name="incomeProvided"
      placeholder="Amount"
      v-validate
      data-vv-as="Income Provided"
      data-vv-rules="required|decimal:2"
      :value="group.incomeProvided"
      @keyup="(e) => $emit('input', { incomeProvided: e.target.value })"
      ref="mincome"
    />
    </textarea>
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
  }
}
</script>
