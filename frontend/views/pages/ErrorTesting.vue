<template lang="pug">
//- This is a debug/testing page that shouldn't use i18n tag or L function
page
  template(#title='') Error Testing
  page-section
    p Enable side effect error type:&nbsp;
      select(:value='form.sideEffectErrorType')
        option(value='none') None
        option(value='GIErrorIgnore') GIErrorIgnore
        option(value='GIErrorIgnoreAndBanIfGroup') GIErrorIgnoreAndBanIfGroup
        option(value='GIErrorSaveAndReprocess') GIErrorSaveAndReprocess
        option(value='unknown') Unknown
  page-section
    a.button(@click='sendMalformedMessage') Send malformed message
  page-section
    p Send malformed mutation of type:&nbsp;
      select(:value='form.mutationErrorType')
        option(value='GIErrorIgnore') GIErrorIgnore
        option(value='GIErrorIgnoreAndBanIfGroup') GIErrorIgnoreAndBanIfGroup
        option(value='GIErrorSaveAndReprocess') GIErrorSaveAndReprocess
        option(value='unknownType') unknownType
      a.button(@click='sendMalformedMutationOfType') Send
</template>
<script>
import sbp from '~/shared/sbp.js'
import Page from '@pages/Page.vue'
import PageSection from '@components/PageSection.vue'
import { EVENT_HANDLED } from '@utils/events.js'
import * as Errors from '@model/errors.js'

export default {
  name: 'ErrorTesting',
  components: {
    Page,
    PageSection
  },
  data () {
    return {
      form: {
        sideEffectErrorType: 'none',
        mutationErrorType: 'GIErrorIgnore'
      }
    }
  },
  mounted () {
    sbp('okTurtles.events/on', EVENT_HANDLED, (contractID, message) => {
      if (this.form.sideEffectErrorType !== 'none') {
        const ErrorType = Errors[this.form.sideEffectErrorType]
        if (ErrorType) {
          throw new ErrorType('blah!')
        } else {
          throw new Error('unknown error')
        }
      }
    })
  },
  methods: {
    async sendMalformedMessage () {
      const msg = await sbp('gi.contracts/group/inviteAccept/create',
        { inviteSecret: 'poop!' },
        this.$store.state.currentGroupId
      )
      sbp('backend/publishLogEntry', msg)
    },
    async sendMalformedMutationOfType () {
      const msg = await sbp('gi.contracts/group/malformedMutation/create',
        { errorType: this.form.mutationErrorType },
        this.$store.state.currentGroupId
      )
      sbp('backend/publishLogEntry', msg)
    }
  }
}
</script>
