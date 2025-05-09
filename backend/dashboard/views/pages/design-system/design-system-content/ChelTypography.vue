<template lang="pug">
content-outlet(title='Typography')
  .content-unit
    h4.unit-name Various text styles

    .unit-description
      | There are various text-style related css classes are defined.

    table-template
      table-row(code='.is-title-1')
        h1.is-title-1 is-title-1
      table-row(code='.is-title-2')
        h1.is-title-2 is-title-2
      table-row(code='.is-title-3')
        h1.is-title-2 is-title-3
      table-row(code='.is-title-4')
        h1.is-title-2 is-title-4
      table-row(code='.has-text-bold')
        span.has-text-bold has-text-bold
      table-row(code='.has-text-color-1')
        span.has-text-color-1 has-text-color-1
      table-row(code='.has-text-danger')
        span.has-text-danger has-text-danger
      table-row(code='.has-text-warning')
        span.has-text-warning has-text-warning
      table-row(code='.has-family-poppins')
        span.has-family-poppins has-family-poppins

  .content-unit
    h4.unit-name Pills

    .c-container TODO...
</template>

<script>
import ContentOutlet from './ContentOutlet.vue'
import TableTemplate from './TableTemplate.vue'
import TableRow from './TableRow.vue'

export default {
  name: 'ChelForms',
  components: {
    ContentOutlet,
    TableTemplate,
    TableRow
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
