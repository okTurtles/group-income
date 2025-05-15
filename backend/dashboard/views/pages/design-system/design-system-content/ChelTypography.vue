<template lang="pug">
content-outlet(title='Typography')
  .content-unit
    h4.unit-name Various text styles

    .unit-description
      | There are various text-style related css classes that are used across the app. Feel free to extend
      span.pill.is-purple-1 _typography.scss
      | file to define other useful text-related styles.

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
      table-row(code='.link')
        a.link https://groupincome.org/

  .content-unit
    h4.unit-name Pills

    .unit-description
      | Check out
      span.pill.is-purple-1 _pills.scss
      | file for the css details.

    table-template.mt-0
      table-row(code='.pill.is-neautral')
        span.pill.is-neautral neutral
      table-row(code='.pill.is-danger')
        span.pill.is-danger danger
      table-row(code='.pill.is-warning')
        span.pill.is-warning warning
      table-row(code='.pill.is-purple-1')
        span.pill.is-purple-1 purple-1
      table-row(code='.pill.is-blue-1')
        span.pill.is-blue-1 blue-1
      table-row(code='.pill.is-green-1')
        span.pill.is-green-1 green-1

  .content-unit
    h4.unit-name TBD...

    .unit-description TBD...
</template>

<script>
import ContentOutlet from './ContentOutlet.vue'
import TableTemplate from './TableTemplate.vue'
import TableRow from './TableRow.vue'

export default {
  name: 'ChelTypography',
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
