<template lang='pug'>
//- This is a debug/testing page that shouldn't use i18n tag or L function
page
  template(#title='') Error Testing
  page-section
    p Enable side effect error type on handleEvent:&nbsp;
      select(v-model='form.sideEffectErrorType')
        option(value='none') None
        option(value='GIErrorIgnoreAndBan') GIErrorIgnoreAndBan
        option(value='GIErrorUIRuntimeError') GIErrorUIRuntimeError
        option(value='ChelErrorDBBadPreviousHEAD') ChelErrorDBBadPreviousHEAD
        option(value='unknown') Unknown
  page-section
    a.button(@click='sendMalformedMessage') Send malformed message
  page-section
    p Send malformed mutation of type:&nbsp;
      select(v-model='form.mutationErrorType')
        option(value='GIErrorIgnoreAndBan') GIErrorIgnoreAndBan
        option(value='GIErrorUIRuntimeError') GIErrorUIRuntimeError
        option(value='ChelErrorDBBadPreviousHEAD') ChelErrorDBBadPreviousHEAD
        option(value='unknownType') unknownType
      a.button(@click='sendMalformedMutationOfType') Send
</template>
<script>
import sbp from '@sbp/spb'
import Page from '@components/Page.vue'
import PageSection from '@components/PageSection.vue'
import { EVENT_HANDLED } from '~/shared/domains/chelonia/chelonia.js'
import { ChelErrorDBBadPreviousHEAD } from '~/shared/domains/chelonia/errors.js'
import { GIErrorIgnoreAndBan, GIErrorUIRuntimeError } from '@model/errors.js'

const Errors = { ChelErrorDBBadPreviousHEAD, GIErrorIgnoreAndBan, GIErrorUIRuntimeError }

export default ({
  name: 'ErrorTesting',
  components: {
    Page,
    PageSection
  },
  data () {
    return {
      form: {
        sideEffectErrorType: 'none',
        mutationErrorType: 'GIErrorIgnoreAndBan'
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
      await sbp('chelonia/out/actionEncrypted', {
        action: 'gi.contracts/group/inviteAccept',
        data: { inviteSecret: 'poop!' },
        contractID: this.$store.state.currentGroupId
      })
    },
    async sendMalformedMutationOfType () {
      await sbp('chelonia/out/actionEncrypted', {
        action: 'gi.contracts/group/malformedMutation',
        data: { errorType: this.form.mutationErrorType },
        contractID: this.$store.state.currentGroupId
      })
    }
  }
}: Object)
</script>
