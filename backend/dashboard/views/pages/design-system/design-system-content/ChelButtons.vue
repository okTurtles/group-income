<template lang="pug">
content-outlet(title='Buttons')
  .content-unit
    h4.unit-name Various button classes

    .unit-description
      | There are two types of buttons that are primarily used across the app.
      span.pill.is-purple-1 primary
      | style and
      span.pill.is-purple-1 outlined
      | style. Primary style does not require any css class. To use outlined style, use
      strong .is-outlined
      | css class. Check out other useful button-related css classes below, and feel free to extend
      span.pill.is-purple-1 _buttons.scss
      | file for more styles.

    table-template
      table-row(code='button(type="button")')
        button(type='button') Primary
      table-row(code='button.is-outlined')
        button.is-outlined(type='button') Outlined
      table-row(code='button.has-blue-background')
        button.has-blue-background(type='button') Blue Background
      table-row(code='button(:disabled="true")')
        button(type='button' :disabled='true') Disabled
      table-row(code='button.is-outlined(:disabled="true")')
        button.is-outlined(type='button' :disabled='true') Disabled
      table-row(code='button.is-small')
        button.is-small(type='button') Small button
      table-row(code='button.is-small.is-outlined')
        button.is-small.is-outlined(type='button') Small button
      table-row(code='button.is-small.has-blue-background')
        button.is-small.has-blue-background(type='button') Small button
      table-row(code='button.is-extra-small')
        button.is-extra-small(type='button') Extra small
      table-row(code='button.is-outlined.is-extra-small')
        button.is-outlined.is-extra-small(type='button') Extra small
      table-row(code='button.is-outlined.has-blue-background')
        button.has-blue-background.is-extra-small(type='button') Extra small

  .content-unit
    h4.unit-name Icon buttons

    .unit-description Styles for icons as buttons.

    table-template
      table-row(code='button.is-icon')
        button.is-icon(type='button')
          i.icon-gear
      table-row(code='button.is-icon-small')
        button.is-icon-small(type='button')
          i.icon-menu
</template>

<script>
import ContentOutlet from './ContentOutlet.vue'
import TableTemplate from './TableTemplate.vue'
import TableRow from './TableRow.vue'

export default {
  name: 'ChelButtons',
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
