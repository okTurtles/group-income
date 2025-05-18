<template lang="pug">
content-outlet(title='Icons')
  .content-unit
    h4.unit-name Icon classes

    .unit-description
      | Use
      strong .icon-[name]
      | css class to use icons. Check out
      span.pill.is-purple-1 _icons.scss
      | file to see all available icon names.

    table-template
      table-row.c-row(
        v-for='iconname in iconNames'
        :key='iconname'
        :code='".icon-" + iconname'
      )
        i(:class='"icon-" + iconname')
</template>

<script>
import ContentOutlet from './ContentOutlet.vue'
import TableTemplate from './TableTemplate.vue'
import TableRow from './TableRow.vue'

export default {
  name: 'ChelIcons',
  components: {
    ContentOutlet,
    TableTemplate,
    TableRow
  },
  data () {
    return {
      iconNames: [
        'chalkboard', 'address-book', 'user', 'user-circle', 'user-rectangle',
        'users', 'suitcase', 'list-bullets', 'list-checks', 'menu', 'gear',
        'gear-six', 'plus', 'plus-circle', 'minus', 'minus-circle', 'cross',
        'cross-circle', 'trend-up', 'trend-down', 'chart-up', 'chart-bar',
        'battery-full', 'battery-charging', 'bell', 'check', 'checks',
        'check-circle', 'check-square', 'sun', 'moon', 'moonstar', 'currency-circle',
        'network', 'three-circle-plus', 'caret-up', 'caret-down', 'caret-circle-up',
        'caret-circle-down', 'info', 'close', 'close-circle', 'copy'
      ]
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-row ::v-deep {
  i {
    font-size: 1.5em;
    font-weight: bold;
  }
}
</style>
