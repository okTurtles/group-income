<template>
  <div>
    <h1><i18n>Minimum Income</i18n></h1>
    <input
      class="input"
      type="text"
      name="incomeProvided"
      placeholder="Amount"
      data-vv-as="Income Provided"
      v-validate data-vv-rules="required|decimal:2"
      v-model="incomeProvided"
    />
    </textarea>
    <p><i18n>How much income would you like your group to provide?</i18n></p>
    <router-link
      to="new-group"
    >
      <!-- TODO: to next step instead -->
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
    incomeProvided: {
      get () { return this.$store.state.group.incomeProvided },
      set (value) { this.$store.commit('updateIncomeProvided', value) }
    }
  }
}
</script>
