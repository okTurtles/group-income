<template lang='pug'>
page.c-page
  template(#title='') {{ L('Group Settings') }}
  template(#description='')
    p.p-descritpion.has-text-1 {{ L('Changes to these settings will be visible to all group members') }}

  page-section
    form(@submit.prevent='')
      label.field
        .c-current-label-container
          i18n.label Default currency
          .c-coming-soon
            i.icon-info-circle
            i18n Feature coming soon

        .selectbox.c-currency
          select.select(
            name='mincomeCurrency'
            v-model='form.mincomeCurrency'
            :disabled='true'
          )
            option(
              v-for='(currency, code) in currencies'
              :value='code'
              :key='code'
            ) {{ currency.symbolWithCode }}

        i18n.helper This is the currency that will be displayed for every member of the group, across the platform.

      banner-scoped(ref='formMsg' data-test='formMsg' :allowA='true')

      .buttons
        button-submit.is-success(
          @click='saveSettings'
          data-test='saveBtn'
        ) {{ L('Save changes') }}

  roles-and-permissions

  invitations-table

  page-section(
    v-if='configurePublicChannel'
    :title='L("Public Channels")'
  )
    .c-subcontent(data-test='allowPublicChannels')
      .c-text-content
        i18n.c-smaller-title(tag='h3') Allow members to create public channels
        i18n.c-description(tag='p') Let users create public channels. The data in public channels is intended to be completely public and should be treated with the same care and expectations of privacy that one has with normal social media: that is, you should have zero expectation of any privacy of the content you post to public channels.
      .switch-wrapper
        input.switch(
          type='checkbox'
          name='switch'
          :checked='allowPublicChannels'
          @change='togglePublicChannelCreateAllownace'
        )

  page-section(:title='L("Voting System")')
    group-rules-settings

  page-section(:title='L("Leave Group")')
    i18n.has-text-1(
      tag='p'
      :args='LTags("b")'
    ) This means you will stop having access to the {b_}group chat{_b} (including direct messages to other group members) and {b_}contributions{_b}. Re-joining the group is possible, but requires other members to vote and reach an agreement.

    .buttons
      i18n.is-danger.is-outlined(
        tag='button'
        ref='leave'
        @click='handleLeaveGroup'
        data-test='leaveModalBtn'
      ) Leave group

  //- | ::: Delete Group won't be implemented for prototype.
  //- page-section(:title='L("Delete Group")')
  //-   i18n.has-text-1(tag='p') This will delete all the data associated with this group permanently.

  //-   .buttons(v-if='membersLeft === 0')
  //-     i18n.is-danger.is-outlined(
  //-       tag='button'
  //-       ref='delete'
  //-       @click='openProposal("GroupDeletionModal")'
  //-       data-test='deleteBtn'
  //-     ) Delete group

  //-   banner-simple(severity='info' v-else)
  //-     i18n(
  //-       :args='{ count: membersLeft, groupName: groupSettings.groupName, ...LTags("b")}'
  //-     ) You can only delete a group when all the other members have left. {groupName} still has {b_}{count} other members{_b}.
</template>

<script>
import sbp from '@sbp/sbp'
import { validationMixin } from 'vuelidate'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { mapState, mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import currencies from '@model/contracts/shared/currencies.js'
import Page from '@components/Page.vue'
import PageSection from '@components/PageSection.vue'
import AvatarUpload from '@components/AvatarUpload.vue'
import InvitationsTable from '@containers/group-settings/InvitationsTable.vue'
import RolesAndPermissions from '@containers/group-settings/roles-and-permissions/RolesAndPermissions.vue'
import GroupRulesSettings from '@containers/group-settings/GroupRulesSettings.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import CharLengthIndicator from '@components/CharLengthIndicator.vue'
import { L } from '@common/common.js'

export default ({
  name: 'GroupSettings',
  mixins: [validationMixin, validationsDebouncedMixins],
  components: {
    AvatarUpload,
    BannerScoped,
    ButtonSubmit,
    GroupRulesSettings,
    InvitationsTable,
    RolesAndPermissions,
    CharLengthIndicator,
    Page,
    PageSection
  },
  data () {
    const { mincomeCurrency } = this.$store.getters.groupSettings
    return {
      form: {
        mincomeCurrency
      },
      allowPublicChannels: false
    }
  },
  computed: {
    ...mapState(['currentGroupId']),
    ...mapGetters(['currentGroupOwnerID', 'groupSettings', 'ourIdentityContractId']),
    currencies () {
      return currencies
    },
    isGroupAdmin () {
      // TODO: https://github.com/okTurtles/group-income/issues/202
      return false
    },
    configurePublicChannel () {
      // TODO: check if Chelonia server admin allows to create public channels
      return this.isGroupAdmin && false
    }
  },
  mounted () {
    this.allowPublicChannels = this.groupSettings.allowPublicChannels
  },
  methods: {
    openProposal (component) {
      sbp('okTurtles.events/emit', OPEN_MODAL, component)
    },
    async saveSettings (e) {
      if (this.$v.form.$invalid) {
        this.$refs.formMsg.danger(L('The form is invalid.'))
        return
      }
      const attrs = {}

      for (const key in this.form) {
        if (this.form[key] !== this.groupSettings[key]) {
          attrs[key] = this.form[key]
        }
      }

      try {
        await sbp('gi.actions/group/updateSettings', {
          contractID: this.currentGroupId, data: attrs
        })
        this.$refs.formMsg.success(L('Your changes were saved!'))
      } catch (e) {
        console.error('GroupSettings saveSettings() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
    },
    handleLeaveGroup () {
      if (this.currentGroupOwnerID === this.ourIdentityContractId) {
        this.openProposal('GroupDeletionModal')
      } else {
        this.openProposal('GroupLeaveModal')
      }
    },
    refreshForm () {
      const { mincomeCurrency } = this.groupSettings
      this.form = {
        mincomeCurrency
      }
    },
    async togglePublicChannelCreateAllownace (v) {
      const checked = v.target.checked
      if (this.groupSettings.allowPublicChannels !== checked) {
        await sbp('gi.actions/group/updateSettings', {
          contractID: this.currentGroupId,
          data: {
            allowPublicChannels: checked
          }
        })
        this.allowPublicChannels = checked
      }
    }
  },
  watch: {
    groupSettings () {
      // re-fetch the latest correct values whenever the user switches groups
      this.refreshForm()
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-page ::v-deep .p-main {
  max-width: 37rem;
}

.c-current-label-container {
  display: flex;
  align-items: flex-end;
  column-gap: 0.5rem;

  .c-coming-soon {
    color: $text_1;
    margin-bottom: 0.5rem;
    user-select: none;

    i {
      margin-right: 0.2rem;
    }
  }
}

.c-currency {
  @include tablet {
    width: 50%;
  }
}

.p-descritpion {
  display: none;
  margin-top: 0.25rem;
  padding-bottom: 3rem;

  @include desktop {
    display: block;
  }
}

.c-subcontent {
  border: none;
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem;
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 1.5rem;
  }
}

.c-smaller-title {
  font-size: $size_4;
  font-weight: bold;
}

.c-description {
  margin-top: 0.125rem;
  font-size: $size_4;
  color: $text_1;
}
</style>
