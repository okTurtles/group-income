<template lang='pug'>
page.c-page
  template(#title='') {{ L('Group Settings') }}
  template(#description='') {{ L('Changes to these settings will be visible to all group members') }}

  page-section
    form
      label.field
        i18n.label Group name
        input.input(
          name='groupName'
          type='text'
          v-model='form.groupName'
          data-test='groupName'
        )

      label.field
        i18n.label About the group
        textarea.textarea(
          name='sharedValues'
          maxlength='500'
          :value='form.sharedValues'
        )

      label.field
        i18n.label Default currency
        .select-wrapper.c-currency-select
          select(
            name='mincomeCurrency'
            :value='form.mincomeCurrency'
          )
            option(
              v-for='(currency, code) in currencies'
              :value='code'
              :key='code'
            ) {{ currency.symbol }}

        i18n.helper This is the currency that will be displayed for every member of the group, across the platform.

      banner-scoped(ref='formMsg' data-test='profileMsg')

      .buttons
        i18n.is-success(
          tag='button'
          ref='save'
          @click='save'
          :disabled='$v.form.$invalid'
          data-test='saveBtn'
        ) Save changes

  invitations-table

  page-section(:title='L("Leave Group")')
    i18n.has-text-1(
      tag='p'
      :args='LTags("b")'
    ) This means you will stop having access to the {b_}group chat{_b} (including direct messages to other group members) and {b_}contributions{_b}. Re-joining the group is possible, but requires other members to vote and reach an agreement.

    .buttons
      i18n.is-danger.is-outlined(
        tag='button'
        ref='leave'
        @click='openProposal("GroupLeaveModal")'
        data-test='LeaveBtn'
      ) Leave group

  page-section(:title='L("Delete Group")')
    i18n.has-text-1(tag='p') This will delete all the data associated with this group permanently.

    .buttons
      i18n.is-danger.is-outlined(
        tag='button'
        ref='delete'
        @click='openProposal("GroupDeletionModal")'
        data-test='deleteBtn'
      ) Delete group

    banner-simple(severity='info')
      i18n(
        :args='{ count: groupMembersCount - 1, groupName: groupSettings.groupNname, ...LTags("b")}'
      ) You can only delete a group when all the other members have left. {groupName} still has {b_}{count} other members{_b}.
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import currencies from '@view-utils/currencies.js'
import Page from '@components/Page.vue'
import PageSection from '@components/PageSection.vue'
import InvitationsTable from '@containers/group-settings/InvitationsTable.vue'
import BannerSimple from '@components/banners/BannerSimple.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import L from '@view-utils/translations.js'

export default {
  name: 'GroupSettings',
  mixins: [validationMixin],
  components: {
    Page,
    PageSection,
    InvitationsTable,
    BannerSimple,
    BannerScoped
  },
  data () {
    const { groupName, sharedValues, mincomeCurrency } = this.$store.getters.groupSettings
    return {
      currencies,
      form: {
        groupName: groupName,
        sharedValues: sharedValues,
        mincomeCurrency: mincomeCurrency
      }
    }
  },
  computed: {
    ...mapGetters([
      'groupSettings',
      'groupMembersCount'
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
      // ::::::::::: CONTINUE HERE - handle disable status
      console.log('Save', e)
    }
  },
  validations: {
    form: {
      groupName: {
        [L('A name is required.')]: required
      },
      sharedValues: {
        [L('A group without description?')]: required
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-page ::v-deep .p-main {
  max-width: 37rem;
}

.c-currency-select {
  @include tablet {
    width: 50%;
  }
}
</style>
