<template>
  <section class="has-text-right">
    <p class="min-income-label has-text-grey">Min Income</p>
    <p class="min-income title is-1 is-marginless"
      data-test="minIncome">
      {{ currency }}{{ group.incomeProvided }}
    </p>
    <a href="#">Propose change</a>
  </section>
</template>
<script>
  import { symbol } from '../utils/currencies'
  export default {
    name: 'GroupsMinIncome',
    props: {
      group: Object
    },
    computed: {
      currency: function () {
        return symbol(this.group.incomeCurrency)
      }
    }
  }
</script>
