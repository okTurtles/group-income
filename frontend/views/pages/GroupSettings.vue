<template lang="pug">
page(pageTestName='dashboard' pageTestHeaderName='groupName' v-if='currentGroupState')
  template(#title='') Group Settings

  page-section(title='')
    i18n(tag='p') Changes to these settings will be visible to all group members

    form
      .field
        i18n.label(tag='label') Group name

        input.input.is-large.is-primary(
          ref='name'
          type='text'
          name='groupName'
          :class="{ 'error': $v.form.groupName.$error }"
          :value='currentGroupState.groupName'
          @input='update'
          @keyup.enter='next'
          data-test='groupName'
        )

      .field
        i18n.label(tag='label') Description

        textarea.textarea(
          name='sharedValues'
          ref='purpose'
          placeholder='Group Purpose'
          maxlength='500'
          :class="{ 'error': $v.form.sharedValues.$error }"
          :value='currentGroupState.sharedValues'
          @input='update'
        )

      .field
        i18n.label(tag='label') Default currency
        .select-wrapper
          select(
            name='incomeCurrency'
            required=''
            :value='currentGroupState.incomeCurrency'
            @input='update'
          )
            option(
              v-for='(symbol, code) in currencies'
              :value='code'
              :key='code'
            ) {{ symbol }}

        i18n(tag='p') This is the currency that will be displayed for every member of the group, across the platform.

      i18n.is-success(
        tag='button'
        ref='save'
        @click='save'
        :disabled='$v.form.$invalid'
        data-test='saveBtn'
      ) Save changes

  page-section(title='Leave Group')
    p
      | {{ L('This means you will stop having access to the') }} #[b {{ L('group chat') }}] {{ L('including direct messages to other group members) and') }} #[b {{ L('contributions') }}].
      | {{ L('Re-joining the group is possible, but requires other members to vote and reach an agreement.') }}

    i18n.is-danger.is-outlined(
      tag='button'
      ref='leave'
      @click='openProposal("LeaveGroupModal")'
      data-test='LeaveBtn'
    ) Leave group

  page-section(title='Delete Group')
    i18n(tag='p') This will delete all the data associated with this group permanently.

    i18n.is-danger.is-outlined(
      tag='button'
      ref='delete'
      @click='openProposal("DeleteGroup")'
      data-test='deleteBtn'
    ) Delete group
</template>

<script>
import { mapGetters } from 'vuex'
import sbp from '~/shared/sbp.js'
import { LOAD_MODAL } from '@utils/events.js'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import currencies from '@view-utils/currencies.js'

import Page from '@pages/Page.vue'
import PageSection from '@components/PageSection.vue'

export default {
  name: 'GroupSettings',
  mixins: [validationMixin],
  components: {
    Page,
    PageSection
  },
  data () {
    return {
      currencies
    }
  },
  computed: {
    ...mapGetters([
      'currentGroupState'
    ])
  },
  methods: {
    openProposal (component) {
      sbp('okTurtles.events/emit', LOAD_MODAL, component)
    },
    update (e) {
      // TODO update value
      console.log('Update', e)
    },
    save (e) {
      // TODO save form
      console.log('Save', e)
    }
  },
  validations: {
    form: {
      groupName: {
        required
      },
      sharedValues: {
        required
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";
</style>
