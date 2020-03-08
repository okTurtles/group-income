<template lang='pug'>
page.c-page
  template(#title='') {{ L('Group Settings') }}
  template(#description='') {{ L('Changes to these settings will be visible to all group members') }}

  avatar-upload(
    :avatar='$store.getters.groupSettings.groupPicture'
    :sbpParams='sbpParams'
  )

  page-section
    form(@submit.prevent='saveSettings')
      label.field
        i18n.label Group name
        input.input(
          type='text'
          :class='{error: $v.form.groupName.$error}'
          v-model='form.groupName'
          @input='debounceField("groupName")'
          @blur='updateField("groupName")'
          v-error:groupName=''
          data-test='groupName'
        )

      label.field
        i18n.label About the group
        textarea.textarea(
          maxlength='500'
          :class='{error: $v.form.sharedValues.$error}'
          v-model='form.sharedValues'
          @input='debounceField("sharedValues")'
          @blur='updateField("sharedValues")'
          v-error:sharedValues=''
          data-test='sharedValues'
        )

      label.field
        i18n.label Default currency
        .select-wrapper.c-currency-select
          select(
            name='mincomeCurrency'
            v-model='form.mincomeCurrency'
          )
            option(
              v-for='(currency, code) in currencies'
              :value='code'
              :key='code'
            ) {{ currency.symbolWithCode }}

        i18n.helper This is the currency that will be displayed for every member of the group, across the platform.

      banner-scoped(ref='formMsg' data-test='formMsg')

      .buttons
        i18n.is-success(
          tag='button'
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

    .buttons(v-if='membersLeft === 0')
      i18n.is-danger.is-outlined(
        tag='button'
        ref='delete'
        @click='openProposal("GroupDeletionModal")'
        data-test='deleteBtn'
      ) Delete group

    banner-simple(severity='info' v-else)
      i18n(
        :args='{ count: membersLeft, groupName: groupSettings.groupName, ...LTags("b")}'
      ) You can only delete a group when all the other members have left. {groupName} still has {b_}{count} other members{_b}.
</template>

<script>
import sbp from '~/shared/sbp.js'
import { validationMixin } from 'vuelidate'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { mapState, mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import { required } from 'vuelidate/lib/validators'
import currencies from '@view-utils/currencies.js'
import Page from '@components/Page.vue'
import PageSection from '@components/PageSection.vue'
import AvatarUpload from '@components/AvatarUpload.vue'
import InvitationsTable from '@containers/group-settings/InvitationsTable.vue'
import BannerSimple from '@components/banners/BannerSimple.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import L from '@view-utils/translations.js'

export default {
  name: 'GroupSettings',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    Page,
    PageSection,
    InvitationsTable,
    AvatarUpload,
    BannerSimple,
    BannerScoped
  },
  data () {
    const { groupName, sharedValues, mincomeCurrency } = this.$store.getters.groupSettings
    return {
      form: {
        groupName,
        sharedValues,
        mincomeCurrency
      },
      ephemeral: {
        isSubmitting: false
      }
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupSettings',
      'groupMembersCount'
    ]),
    membersLeft () {
      return this.groupMembersCount - 1
    },
    currencies () {
      return currencies
    },
    sbpParams () {
      return {
        selector: 'gi.contracts/group/updateSettings/create',
        contractID: this.$store.state.currentGroupId,
        key: 'groupPicture'
      }
    }
  },
  methods: {
    openProposal (component) {
      sbp('okTurtles.events/emit', OPEN_MODAL, component)
    },
    async saveSettings (e) {
      if (this.ephemeral.isSubmitting) { return }
      this.ephemeral.isSubmitting = true
      const attrs = {}

      for (const key in this.form) {
        if (this.form[key] !== this.groupSettings[key]) {
          attrs[key] = this.form[key]
        }
      }

      try {
        const settings = await sbp('gi.contracts/group/updateSettings/create',
          attrs,
          this.currentGroupId
        )
        await sbp('backend/publishLogEntry', settings)
        this.$refs.formMsg.success(L('Your changes were saved!'))
      } catch (e) {
        this.$refs.formMsg.danger(L('Failed to update group settings. {codeError}', { codeError: e.message }))
      }
      this.ephemeral.isSubmitting = false
    }
  },
  validations: {
    form: {
      groupName: {
        [L('This field is required')]: required
      },
      sharedValues: {
        [L('This field is required')]: required
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
