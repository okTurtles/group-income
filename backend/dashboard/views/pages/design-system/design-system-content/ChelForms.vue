<template lang="pug">
content-outlet(title='Forms')
  .content-unit
    h4.unit-name Vue components

    .unit-description
      | Some form elements exists as a
      span.pill.is-neautral .vue
      | component

    table-template
      table-row(code='<toggle-switch />')
        toggle-switch(v-model='forms.switchToggle')
</template>

<script>
import ContentOutlet from './ContentOutlet.vue'
import TableTemplate from './TableTemplate.vue'
import TableRow from './TableRow.vue'
import ToggleSwitch from '@components/forms/ToggleSwitch.vue'

export default {
  name: 'ChelForms',
  components: {
    ContentOutlet,
    TableTemplate,
    TableRow,
    ToggleSwitch
  },
  data () {
    return {
      forms: {
        switchToggle: false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
