<template lang="pug">
page(pageTestName='dashboard' pageTestHeaderName='groupName' v-if='currentGroupState')
  template(#title='') Group Settings

  page-section(title='')
    p Changes to these settings will be visible to all group members

    form
      .field
        label.label
          i18n Group name

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
        label.label
          i18n Description

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
        label.label
          i18n Default currency
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

        p This is the currency that will be displayed for every member of the group, across the platform.

      button.is-success(
        ref='save'
        @click='save'
        :disabled='$v.form.$invalid'
        data-test='saveBtn'
      )
        i18n Save changes

  page-section(title='Leave Group')
    p This means you will stop having access to the #[b group chat] (including direct messages to other group members) and #[b contributions]. Re-joining the group is possible, but requires other members to vote and reach an agreement.

    button.is-danger.is-outlined(
      ref='leave'
      @click='openProposal("LeaveGroupModal")'
      data-test='LeaveBtn'
    )
      i18n Leave group

  page-section(title='Delete Group')
    p This will delete all the data associated with this group permanently.

    button.is-danger.is-outlined(
      ref='delete'
      @click='openProposal("DeleteGroup")'
      data-test='deleteBtn'
    )
      i18n Delete group
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
  mixins: [ validationMixin ],
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
