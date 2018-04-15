<template>
  <div>
    <h1 class="subtitle is-2 has-text-centered"><i18n>Minimum Income</i18n></h1>
    <div class="field has-addons">
      <div class="control">
        <span class="select is-large is-primary">
          <select
            name="incomeCurrency"
            required
            :value="group.incomeCurrency"
            @input="update"
          >
            <option v-for="(symbol, code) in currencies" :value="code">{{ symbol }}</option>
          </select>
        </span>
      </div>
      <div class="control">
        <input
          class="input is-large is-primary"
          :class="{ 'is-danger': v.incomeProvided.$error }"
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
import currencies from '../../js/currencies'

export default {
  name: 'CreateGroupMincome',
  props: {
    group: {type: Object},
    v: {type: Object}
  },
  data () {
    return {
      currencies
    }
  },
  mounted () {
    this.$refs.mincome.focus()
  },
  methods: {
    update (e) {
      this.v[e.target.name].$touch()
      this.$emit('input', {
        data: {
          [e.target.name]: e.target.value
        }
      })
    }
  }
}
</script>
