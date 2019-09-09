<template lang="pug">
//- This is a debug/testing page that shouldn't use i18n tag or L function
page
  template(#title='') Error Testing
  page-section
    p Enable side effect error type on handleEvent:&nbsp;
      select(v-model='form.sideEffectErrorType')
        option(value='none') None
        option(value='GIErrorIgnoreAndBanIfGroup') GIErrorIgnoreAndBanIfGroup
        option(value='GIErrorDropAndReprocess') GIErrorDropAndReprocess
        option(value='GIErrorUnrecoverable') GIErrorUnrecoverable
        option(value='unknown') Unknown
  page-section
    a.button(@click='sendMalformedMessage') Send malformed message
  page-section
    p Send malformed mutation of type:&nbsp;
      select(v-model='form.mutationErrorType')
        option(value='GIErrorIgnoreAndBanIfGroup') GIErrorIgnoreAndBanIfGroup
        option(value='GIErrorDropAndReprocess') GIErrorDropAndReprocess
        option(value='GIErrorUnrecoverable') GIErrorUnrecoverable
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
        mutationErrorType: 'GIErrorIgnoreAndBanIfGroup'
      }
    }
  },
  mounted () {
    sbp('okTurtles.events/on', EVENT_HANDLED, (contractID, message) => {
      if (this.form.sideEffectErrorType !== 'none') {
        console.debug(`ErrorTesting page EVENT_HANDLED callback about to throw '${this.form.sideEffectErrorType}' error`)
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
