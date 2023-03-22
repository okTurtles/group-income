<template lang='pug'>
page-template
  template(#title='') {{ L('Accounts') }}

  section.c-create-instance-section
    i18n.section-title Create a new instance

    form.c-forms(@submit.prevent='')
      StyledInput.c-instance-name(
        v-model='form.instanceName'
        :label='L("Instance name")'
        placeholder='type anything...'
      )
</template>

<script>
import PageTemplate from './PageTemplate.vue'
import StyledInput from '@forms/StyledInput.vue'

export default {
  name: 'Accounts',
  components: {
    PageTemplate,
    StyledInput
  },
  data () {
    return {
      form: {
        instanceName: ''
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.c-forms {
  position: relative;
  margin-top: 2rem;
}
</style>
