<template lang='pug'>
  // TODO #658
  form.c-avatar-form(@submit.prevent='')
    .c-avatar-wrapper
      label.c-avatar-label
        avatar.c-avatar-img(
          :src='form.picture'
          ref='picture'
        )
        i18n.link.c-avatar-text Change avatar

        input.sr-only(
          type='file'
          name='picture'
          accept='image/*'
          @change='fileChange($event.target.files)'
          placeholder='http://'
          data-test='avatar'
        )
      banner-scoped.c-formMsg(ref='formMsg' data-test='avatarMsg')
</template>
<script>
import sbp from '~/shared/sbp.js'
import imageUpload from '@utils/imageUpload.js'
import Avatar from '@components/Avatar.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import L from '@view-utils/translations.js'

export default {
  name: 'AvatarUpload',
  props: {
    variant: {
      type: String,
      validator: (value) => ['user', 'group'].includes(value),
      required: true
    }
  },
  components: {
    Avatar,
    BannerScoped
  },
  data () {
    const picture = {
      user: this.$store.getters.ourUserIdentityContract.attributes.picture,
      group: this.$store.getters.groupSettings.groupPicture
    }[this.variant]

    return {
      form: {
        picture
      },
      ephemeral: {
        isSubmitting: false
      }
    }
  },
  computed: {
    sbpParams () {
      return {
        user: {
          selector: 'gi.contracts/identity/setAttributes/create',
          contractID: this.$store.state.loggedIn.identityContractID,
          key: 'picture'
        },
        group: {
          selector: 'gi.contracts/group/updateSettings/create',
          contractID: this.$store.state.currentGroupId,
          key: 'groupPicture'
        }
      }[this.variant]
    }
  },
  methods: {
    async fileChange (fileList) {
      if (!fileList.length) return
      const fileReceived = fileList[0]
      let picture

      try {
        picture = await imageUpload(fileReceived)
      } catch (e) {
        console.error(e)
        this.$refs.formMsg.danger(L('Failed to upload avatar. {codeError}', { codeError: e.message }))
        return false
      }

      try {
        const { selector, contractID, key } = this.sbpParams
        const newPicture = await sbp(selector,
          { [key]: picture },
          contractID
        )
        await sbp('backend/publishLogEntry', newPicture)
        this.$refs.picture.setFromBlob(fileReceived)
        this.$refs.formMsg.success(L('Avatar updated!'))
      } catch (e) {
        console.error('Failed to save avatar', e)
        this.$refs.formMsg.danger(L('Failed to save avatar. {codeError}', { codeError: e.message }))
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-avatar {
  &-form {
    position: relative;
  }

  &-wrapper {
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    text-align: center;

    @include desktop {
      align-items: flex-end;
    }
  }

  &-label {
    @include touch {
      margin-bottom: $spacer*1.5;
    }

    @include desktop {
      position: absolute;
      top: -6.5rem;
      right: 0;
      align-items: flex-end;
      margin-bottom: -0.5rem;
    }
  }

  &-img {
    margin: 0 auto;
    width: 8rem;
    height: 8rem;

    @include desktop {
      width: 4.5rem;
      height: 4.5rem;
    }
  }

  &-text {
    display: inline-block;
  }
}

.c-formMsg {
  width: 100%;

  ::v-deep .c-banner {
    margin: 0 0 $spacer*1.5;

    @include desktop {
      margin: 0.5rem 0 $spacer*1.5;
    }
  }
}
</style>
