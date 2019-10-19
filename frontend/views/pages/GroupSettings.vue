<template lang='pug'>
page(pageTestName='dashboard' pageTestHeaderName='groupName' v-if='groupSettings.groupName')
  template(#title='') {{ L('Group Settings') }}
  template(#description='') {{ L('Changes to these settings will be visible to all group members') }}

  page-section(title='')

    form
      .field
        i18n.label(tag='label') Group name

        //- BUG: TODO: cannot bind directly to :value here, as any changes
        //- to groupSettings must be done via proposals and/or
        //- like it's done in UserProfile.vue
        input.input.is-large.is-primary(
          ref='name'
          type='text'
          name='groupName'
          :class='{ error: $v.form.groupName.$error }'
          :value='groupSettings.groupName'
          @input='update'
          @keyup.enter='next'
          data-test='groupName'
        )

      .field
        i18n.label(tag='label') Description

        textarea.textarea(
          name='sharedValues'
          ref='purpose'
          :placeholder='L("Group Purpose")'
          maxlength='500'
          :class='{ error: $v.form.sharedValues.$error }'
          :value='groupSettings.sharedValues'
          @input='update'
        )

      .field
        i18n.label(tag='label') Default currency
        .select-wrapper
          select(
            name='mincomeCurrency'
            required=''
            :value='groupSettings.mincomeCurrency'
            @input='update'
          )
            option(
              v-for='(currency, code) in currencies'
              :value='code'
              :key='code'
            ) {{ currency.symbol }}

        i18n(tag='p') This is the currency that will be displayed for every member of the group, across the platform.

      i18n.is-success(
        tag='button'
        ref='save'
        @click='save'
        :disabled='$v.form.$invalid'
        data-test='saveBtn'
      ) Save changes

  invitelinks

  page-section(:title='L("Leave Group")')
    i18n(tag='p' html='This means you will stop having access to the <b>group chat</b> (including direct messages to other group members) and <b>contributions</b>. Re-joining the group is possible, but requires other members to vote and reach an agreement.')

    i18n.is-danger.is-outlined(
      tag='button'
      ref='leave'
      @click='openProposal("LeaveGroupModal")'
      data-test='LeaveBtn'
    ) Leave group

  page-section(:title='L("Delete Group")')
    i18n(tag='p') This will delete all the data associated with this group permanently.

    i18n.is-danger.is-outlined(
      tag='button'
      ref='delete'
      @click='openProposal("DeleteGroup")'
      data-test='deleteBtn'
    ) Delete group
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import currencies from '@view-utils/currencies.js'

import Page from '@pages/Page.vue'
import PageSection from '@components/PageSection.vue'
import Invitelinks from '@components/GroupSettings/InviteLinks.vue'

export default {
  name: 'GroupSettings',
  mixins: [validationMixin],
  components: {
    Page,
    PageSection,
    Invitelinks
  },
  data () {
    return {
      currencies
    }
  },
  computed: {
    ...mapGetters([
      'groupSettings'
    ])
  },
  methods: {
    openProposal (component) {
      sbp('okTurtles.events/emit', OPEN_MODAL, component)
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
</style>
