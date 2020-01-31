<template lang='pug'>
page.c-page
  template(#title='') {{ L('Group Settings') }}
  template(#description='') {{ L('Changes to these settings will be visible to all group members') }}

  form.c-form-avatar(@submit.prevent='')
    .c-avatar
      label.c-avatar-field
        avatar.c-avatar-img(
          :src='form.groupPicture'
          ref='picture'
        )
        i18n.link.c-avatar-text Change avatar

        input.sr-only(
          type='file'
          name='groupPicture'
          accept='image/*'
          @change='fileChange($event.target.files)'
          placeholder='http://'
          data-test='groupPicture'
        )
      // TODO #658
      banner-scoped.c-bannerAvatarMsg(ref='bannerPictureMsg' data-test='bannerPictureMsg')

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

      banner-scoped(ref='formMsg' data-test='profileMsg')

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
        :args='{ count: membersLeft, groupName: groupSettings.groupNname, ...LTags("b")}'
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
import imageUpload from '@utils/imageUpload.js'
import Page from '@components/Page.vue'
import PageSection from '@components/PageSection.vue'
import Avatar from '@components/Avatar.vue'
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
    Avatar,
    BannerSimple,
    BannerScoped
  },
  data () {
    const { groupName, groupPicture, sharedValues, mincomeCurrency } = this.$store.getters.groupSettings
    return {
      form: {
        groupName,
        groupPicture,
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
    }
  },
  methods: {
    openProposal (component) {
      sbp('okTurtles.events/emit', OPEN_MODAL, component)
    },
    async fileChange (fileList) {
      if (!fileList.length) return
      const fileReceived = fileList[0]
      let picture

      try {
        picture = await imageUpload(fileReceived)
      } catch (e) {
        console.error(e)
        this.$refs.bannerPictureMsg.danger(L('Failed to upload avatar. {codeError}', { codeError: e.message }))
        return false
      }

      try {
        await this.setAttributes({ groupPicture: picture })
        this.$refs.picture.setFromBlob(fileReceived)
        this.$refs.bannerPictureMsg.success(L('Avatar updated!'))
      } catch (e) {
        console.error('Failed to save avatar', e)
        this.$refs.bannerPictureMsg.danger(L('Failed to save avatar. {codeError}', { codeError: e.message }))
      }
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
        const updatedAttrs = await this.setAttributes(attrs)
        await sbp('backend/publishLogEntry', updatedAttrs)
        this.$refs.formMsg.success(L('Your changes were saved!'))
      } catch (e) {
        this.$refs.formMsg.danger(L('Failed to update group settings. {codeError}', { codeError: e.message }))
      }
      this.ephemeral.isSubmitting = false
    },
    async setAttributes (attrs) {
      const settings = await sbp('gi.contracts/group/updateSettings/create',
        attrs,
        this.currentGroupId
      )
      await sbp('backend/publishLogEntry', settings)
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

.c-form-avatar {
  position: relative;
}

.c-avatar-field {
  @include touch {
    margin-bottom: $spacer*1.5;
  }

  @include desktop {
    position: absolute;
    top: -6.5rem; // -3.5rem;
    right: 0;
    align-items: flex-end;
  }
}

.c-avatar {
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  text-align: center;

  @include desktop {
    align-items: flex-end;

    label {
      margin-bottom: -0.5rem; /* temporary until #658 */
    }
  }

  &-img {
    width: 8rem;
    height: 8rem;
    /* margin-bottom: $spacer-sm; */

    @include desktop {
      width: 4.5rem;
      height: 4.5rem;
    }
  }

  &-text {
    display: inline-block;
  }
}

.c-bannerAvatarMsg {
  width: 100%;

  ::v-deep .c-banner {
    margin: 0 0 $spacer*1.5;

    @include desktop {
      margin: 0.5rem 0 $spacer*1.5;
    }
  }
}

.c-currency-select {
  @include tablet {
    width: 50%;
  }
}
</style>
