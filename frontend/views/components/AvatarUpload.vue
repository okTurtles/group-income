<template lang='pug'>
  form.c-avatar-form(@submit.prevent='')
    .c-avatar-wrapper
      label.c-avatar-label
        avatar.c-avatar-img(
          :src='avatar'
          ref='picture'
          size='xl'
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
import sbp from '@sbp/sbp'
import { OPEN_MODAL, AVATAR_EDITED } from '@utils/events.js'
import { L, LError } from '@common/common.js'
import { imageUpload } from '@utils/image.js'
import Avatar from '@components/Avatar.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'

export default ({
  name: 'AvatarUpload',
  props: {
    avatar: [String, Object],
    sbpParams: {
      type: Object,
      required: true
    },
    avatarType: {
      type: String,
      validator: v => ['user', 'group'].includes(v) // feel free to extend this list.
    }
  },
  components: {
    Avatar,
    BannerScoped
  },
  methods: {
    fileChange (fileList) {
      if (!fileList.length) return
      const imageUrl = URL.createObjectURL(fileList[0])

      sbp('okTurtles.events/emit', OPEN_MODAL, 'AvatarEditorModal', { imageUrl, avatarType: this.avatarType })
    },
    async uploadEditedImage ({ blob, avatarType }) {
      if (avatarType !== this.avatarType) { return }
      let picture

      try {
        picture = await imageUpload(blob, { billableContractID: this.sbpParams.contractID })
      } catch (e) {
        console.error('AvatarUpload imageUpload() error:', e)
        this.$refs.formMsg.danger(L('Failed to upload avatar. {reportError}', LError(e)))
        return false
      }

      try {
        const { selector, contractID, key } = this.sbpParams
        await sbp(selector, { contractID, data: { [key]: picture } })
        // calling `setFromBlob` seems unnecessary here since the bound :avatar
        // parameter should get updated after the upload completes.
        // also, calling it here prevents the avatar from switching in Group Settings if we
        // just uploaded a new image and then switch groups (see #1425)
        // this.$refs.picture.setFromBlob(fileReceived)
        this.$refs.formMsg.success(L('Avatar updated!'))
      } catch (e) {
        console.error('AvatarUpload fileChange() error:', e)
        this.$refs.formMsg.danger(L('Failed to save avatar. {reportError}', LError(e)))
      }
    }
  },
  beforeMount () {
    sbp('okTurtles.events/on', AVATAR_EDITED, this.uploadEditedImage)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', AVATAR_EDITED, this.uploadEditedImage)
  }
}: Object)
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
    align-items: center;

    @include desktop {
      align-items: flex-end;
    }
  }

  &-label {
    @include touch {
      margin-bottom: 1.5rem;
    }

    @include desktop {
      position: absolute;
      top: -6.5rem;
      right: 0;
      align-items: flex-end;
      margin-bottom: -0.5rem;
      z-index: 3;
    }
  }

  &-img.is-xl.is-xl { // need .is-xl 2x for specificity
    margin: 0 auto;

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
    margin: 0 0 1.5rem;

    @include desktop {
      margin: 0.5rem 0 1.5rem;
    }
  }
}
</style>
