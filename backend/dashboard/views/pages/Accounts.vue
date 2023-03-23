<template lang='pug'>
page-template
  template(#title='') {{ L('Create a new instance') }}

  section.c-create-instance-section
    form.c-forms(@submit.prevent='')
      .field
        label.label {{ L('Software / Application') }}

        dropdown.c-type-dropdown(
          :options='ephemeral.fakeApplicationOptions'
          @select='onDropdownSelect'
        )

      .field
        StyledInput(
          v-model='form.instanceName'
          :label='L("Instance name")'
          :placeholder='L("Enter instance name")'
        )

        i18n.helper A short alphanumeric name to identify your instance internally. It cannot be changed later and must be unique.

      .field
        StyledInput(
          v-model='form.displayName'
          :label='L("Display name")'
          :placeholder='L("Enter display name")'
        )

        i18n.helper Used on this dashboard to represent your instance.

      .field.mb-15
        StyledInput(
          v-model='form.domain'
          :label='L("Domain")'
          :placeholder='L("Enter domain")'
        )

        i18n.helper The domain name (or subdomain) where you’ll host your instance. It cannot be changed later.

      fieldset.field
        legend.label {{ L('Allow unencrypted data on contracts?') }}

        label.radio
          input.input(
            type='radio'
            name='allowUnencrypted'
            value='yes'
            v-model='form.allowUnencryptedData'
          )
          i18n Allow unencrypted contracts

        label.radio
          input.input(
            type='radio'
            name='allowUnencrypted'
            value='no'
            v-model='form.allowUnencryptedData'
          )
          i18n Don’t allow unencrypted contracts
</template>

<script>
import PageTemplate from './PageTemplate.vue'
import StyledInput from '@forms/StyledInput.vue'
import Dropdown from '@forms/Dropdown.vue'
import { fakeApplicationOptions } from '@view-utils/dummy-data.js'

export default {
  name: 'Accounts',
  components: {
    PageTemplate,
    StyledInput,
    Dropdown
  },
  data () {
    return {
      ephemeral: {
        fakeApplicationOptions
      },
      form: {
        application: '',
        instanceName: '',
        displayName: '',
        domain: '',
        allowUnencryptedData: null
      }
    }
  },
  methods: {
    onDropdownSelect (item) {
      this.form.application = item
    }
  }
}
</script>

<style lang="scss" scoped>
.c-forms {
  position: relative;
}

.mb-15 {
  margin-bottom: 1.5rem;
}
</style>
