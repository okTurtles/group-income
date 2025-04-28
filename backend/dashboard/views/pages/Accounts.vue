<template lang='pug'>
PageTemplate
  template(#title='') {{ L('Create a new instance') }}

  section.c-create-instance-section
    form.c-forms(@submit.prevent='')
      .field
        InfoCard.c-info-card(:heading='L("Note")') {{ L("In order to create a new Application Instance, you’ll need a domain name. If you don’t already have one, you can find an available one and register for a fee with a hosting website and then proceed to create your instance.") }}

      .field
        i18n.label(tag='label') Software / Application

        Dropdown.c-type-dropdown(
          :class='{ "is-error": $v.form.application.$error }'
          :options='ephemeral.fakeApplicationOptions'
          v-error:application=''
          :disable-click-away='true'
          @select='onDropdownSelect'
          @blur='updateField("application", form.application)'
        )

      .field
        StyledInput(
          :class='{ "is-error": $v.form.instanceName.$error }'
          v-model='form.instanceName'
          v-error:instanceName=''
          :label='L("Instance name")'
          :placeholder='L("Enter instance name")'
          :max='config.nameMaxChar'
          @blur='updateField("instanceName", form.instanceName)'
        )

        i18n.helper.c-helper A short alphanumeric name to identify your instance internally. It cannot be changed later and must be unique.

      .field
        StyledInput(
          :class='{ "is-error": $v.form.displayName.$error }'
          v-model='form.displayName'
          v-error:displayName=''
          :label='L("Display name")'
          :placeholder='L("Enter display name")'
          :max='config.displayNameMaxChar'
          @blur='updateField("displayName", form.displayName)'
        )

        i18n.helper.c-helper Used on this dashboard to represent your instance.

      .field.mb-15
        StyledInput(
          :class='{ "is-error": $v.form.domain.$error }'
          v-error:domain=''
          v-model='form.domain'
          :label='L("Domain")'
          :placeholder='L("Enter domain")'
          :max='config.domainMaxChar'
          @blur='updateField("domain", form.domain)'
        )

        i18n.helper.c-helper The domain name (or subdomain) where you’ll host your instance. It cannot be changed later.

      fieldset.field
        legend.label
          span {{ L('Allow unencrypted data on contracts?') }}
          tooltip.c-radio-tooltip(
            :content='L("If you don\'t want to moderate public data you should disable unencrypted contract data.")'
            position='bottom-right'
          )

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
          i18n Forbid unencrypted data

      .c-btn-container
        i18n.is-outlined(tag='button' @click='onCancelClick') Cancel
        i18n(tag='button' @click='onSaveClick' :disabled='$v.form.$invalid') Save
</template>

<script>
import L from '@common/translations.js'
import PageTemplate from './PageTemplate.vue'
import StyledInput from '@forms/StyledInput.vue'
import Dropdown from '@forms/Dropdown.vue'
import InfoCard from '@components/InfoCard.vue'
import Tooltip from '@components/Tooltip.vue'
import { fakeApplicationOptions } from '@view-utils/dummy-data.js'
import validationMixin from '@view-utils/validationMixin.js'
import { required } from '@validators'

export default {
  name: 'Accounts',
  mixins: [validationMixin],
  components: {
    PageTemplate,
    StyledInput,
    Dropdown,
    InfoCard,
    Tooltip
  },
  data () {
    return {
      config: {
        // NOTE: Below are arbitrary values.
        nameMaxChar: 80,
        displayNameMaxChar: 80,
        domainMaxChar: 320
      },
      ephemeral: {
        fakeApplicationOptions
      },
      form: {
        application: null,
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
    },
    onCancelClick () {
      this.$router.push({ path: '/main' })
    },
    onSaveClick () {
      this.$v.$touch()
    }
  },
  validations: {
    form: {
      application: { [L('An application has to be selected.')]: required },
      instanceName: { [L('An instance name is required.')]: required },
      displayName: { [L('A display name is required.')]: required },
      domain: { [L('A domain address is required.')]: required }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-create-instance-section {
  @include phone {
    max-width: max-content;
    margin: 0 auto;
  }
}

.c-forms {
  position: relative;
}

.mb-15 {
  margin-bottom: 1.5rem;
}

.c-btn-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2.5rem;
  padding: 0 0.5rem;
}

.c-helper {
  padding: 0 0.25rem;
}

.c-radio-tooltip {
  margin-left: 0.325rem;
}
</style>
