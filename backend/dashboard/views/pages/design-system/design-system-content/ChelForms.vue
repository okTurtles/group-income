<template lang="pug">
content-outlet(title='Forms')
  .content-unit
    h4.unit-name Styled Input

    .unit-description
      | Use
      span.pill.is-neautral ToggleSwitch.vue
      | component. It has 'max' prop that allows to limit the number of characters, which is indiated via
      span.pill.is-neautral CharLimitIndicator.vue
      | component.

    table-template
      table-row(code='<styled-input v-model="..." />')
        styled-input(
          label='Username'
          placeholder='Enter user name'
          :max='100'
          v-model='forms.styledInput1'
        )

      table-row(code='<styled-input :disabled="true" />')
        styled-input(
          label='Username'
          placeholder='Enter user name'
          :max='100'
          :disabled='true'
          v-model='forms.styledInput2'
        )

      table-row(code='<styled-input class="is-error" />')
        styled-input(
          class='is-error'
          label='Username'
          placeholder='Enter user name'
          :max='100'
          v-model='forms.styledInput3'
        )

  .content-unit
    h4.unit-name Toggle Switch

    .unit-description
      | Use
      span.pill.is-neautral ToggleSwitch.vue
      | component

    table-template
      table-row(code='<toggle-switch />')
        toggle-switch(v-model='forms.switchToggle')
      table-row(code='<toggle-switch :disabled="true" />')
        toggle-switch(v-model='forms.switchToggle2' :disabled='true')
</template>

<script>
import ContentOutlet from './ContentOutlet.vue'
import TableTemplate from './TableTemplate.vue'
import TableRow from './TableRow.vue'
import ToggleSwitch from '@forms/ToggleSwitch.vue'
import StyledInput from '@forms/StyledInput.vue'

export default {
  name: 'ChelForms',
  components: {
    ContentOutlet,
    TableTemplate,
    TableRow,
    ToggleSwitch,
    StyledInput
  },
  data () {
    return {
      forms: {
        switchToggle: false,
        switchToggle2: false,
        styledInput1: 'John Doe',
        styledInput2: 'Disabled style',
        styledInput3: 'Error style'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
