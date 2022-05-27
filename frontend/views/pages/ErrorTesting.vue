<template lang='pug'>
//- This is a debug/testing page that shouldn't use i18n tag or L function
page
  template(#title='') Error Testing
  page-section
    p Send malformed mutation of type:&nbsp;
      select(v-model='form.mutationErrorType')
        option(value='GIErrorIgnoreAndBan') GIErrorIgnoreAndBan
        option(value='GIErrorUIRuntimeError') GIErrorUIRuntimeError
        option(value='ChelErrorDBBadPreviousHEAD') ChelErrorDBBadPreviousHEAD
        option(value='unknownType') unknownType
      a.button(@click='sendMalformedMutationOfType') Send malformed mutation
  page-section
    p Enable side effect error type on handleEvent:&nbsp;
      select(v-model='form.sideEffectErrorType')
        option(value='GIErrorIgnoreAndBan') GIErrorIgnoreAndBan
        option(value='GIErrorUIRuntimeError') GIErrorUIRuntimeError
        option(value='ChelErrorDBBadPreviousHEAD') ChelErrorDBBadPreviousHEAD
        option(value='unknown') Unknown
      a.button(@click='sendMalformedSideEffect') Send malformed sideEffect
</template>
<script>
import {
  sbp
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path
import Page from '@components/Page.vue'
import PageSection from '@components/PageSection.vue'

export default ({
  name: 'ErrorTesting',
  components: {
    Page,
    PageSection
  },
  data () {
    return {
      form: {
        mutationErrorType: 'GIErrorIgnoreAndBan',
        sideEffectErrorType: 'GIErrorUIRuntimeError'
      }
    }
  },
  methods: {
    async sendMalformedSideEffect () {
      await sbp('chelonia/out/actionEncrypted', {
        action: 'gi.contracts/group/malformedMutation',
        data: { errorType: this.form.mutationErrorType, sideEffect: true },
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
