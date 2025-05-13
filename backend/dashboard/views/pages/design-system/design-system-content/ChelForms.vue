<template lang="pug">
content-outlet(title='Forms')
  .content-unit
    h4.unit-name Styled Input

    .unit-description
      | Use
      span.pill.is-purple-1 ToggleSwitch.vue
      | component. It has 'max' prop that allows to limit the number of characters, which is indiated via
      span.pill.is-purple-1 CharLimitIndicator.vue
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
      span.pill.is-purple-1 ToggleSwitch.vue
      | component

    table-template
      table-row(code='<toggle-switch />')
        toggle-switch(v-model='forms.switchToggle')
      table-row(code='<toggle-switch :disabled="true" />')
        toggle-switch(v-model='forms.switchToggle2' :disabled='true')

  .content-unit
    h4.unit-name Tooltip

    .unit-description
      | Use
      span.pill.is-purple-1 Tooltip.vue
      | component. Specify
      strong 'content'
      | prop for the tooltip content and use
      strong 'position'
      | prop to set the direction of the tooltip.

    table-template
      table-row(code='tooltip(content="..." direction="...")')
        tooltip(content='If you don\'t want to moderate public data you should disable unencrypted contract data.')

  .content-unit
    h4.unit-name Modal & prompt

    .unit-description
      | Spawning a modal or a prompt can be done via calling corresponding sbp selectors.
      |  Use
      strong 'sbp('okTurtles.events/emit', OPEN_MODAL, 'modalName', ...)'
      | to use a modal.
      | Use
      strong 'sbp('okTurtles.events/emit', OPEN_PROMPT, params)'
      | to display a prompt. Note that these two can be displayed at the same time too, and
      |  in this case the prompt is placed on top of the modal.

    table-template
      table-row(code='sbp("okTurtles.events/emit", OPEN_MODAL)')
        button.is-small(type='button' @click='onModalBtnClick') Open example modal
      table-row(code='sbp("okTurtles.events/emit", OPEN_MODAL)')
        button.is-small.is-outlined(type='button' @click='onPromptBtnClick') Open example prompt

  .content-unit
    h4.unit-name TBD...

    .unit-description TBD...
</template>

<script>
import sbp from '@sbp/sbp'
import ContentOutlet from './ContentOutlet.vue'
import TableTemplate from './TableTemplate.vue'
import TableRow from './TableRow.vue'
import ToggleSwitch from '@forms/ToggleSwitch.vue'
import StyledInput from '@forms/StyledInput.vue'
import Tooltip from '@components/Tooltip.vue'
import { contractDummyData } from '@view-utils/dummy-data.js'
import { OPEN_MODAL, OPEN_PROMPT } from '@view-utils/events.js'

export default {
  name: 'ChelForms',
  components: {
    ContentOutlet,
    TableTemplate,
    TableRow,
    ToggleSwitch,
    StyledInput,
    Tooltip
  },
  data () {
    return {
      forms: {
        switchToggle: false,
        switchToggle2: false,
        styledInput1: 'John Doe',
        styledInput2: 'Disabled style',
        styledInput3: 'Error style'
      },
      dummyContractItem: contractDummyData[0]
    }
  },
  methods: {
    onModalBtnClick () {
      sbp(
        'okTurtles.events/emit',
        OPEN_MODAL,
        'ViewContractManifestModal',
        { contract: this.dummyContractItem }
      )
    },
    onPromptBtnClick () {
      sbp(
        'okTurtles.events/emit',
        OPEN_PROMPT,
        {
          title: 'Prompt title',
          content: 'Use <strong>sbp("okTurtles.events/emit", OPEN_PROMPT, params)</strong> to display a prompt.',
          primaryButton: 'OK',
          secondaryButton: 'Close'
        }
      )
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
