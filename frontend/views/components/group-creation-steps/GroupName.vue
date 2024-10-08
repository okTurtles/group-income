<template lang='pug'>
.wrapper
  i18n.is-title-4.steps-title(tag='h4') 1. Create a new group

  label.avatar(for='groupPicture')
    canvas.c-pictureCanvas(ref='pictureCanvas' :class='{isHidden: $assistant.ephemeral.groupPictureType === "image" }')
    avatar.c-pictureAvatar(ref='pictureAvatar' size='xl' src='/assets/images/group-avatar-default.png' :alt='L("Group avatar")')

    i18n.link Upload an image
    input.groupPictureInput#groupPicture(
      type='file'
      name='groupPicture'
      accept='image/*'
      :class='{error: $v.form.groupPicture.$error}'
      @change='fileChange($event.target.files)'
      placeholder='http://'
      data-test='groupPicture'
    )

  i18n.error(v-if='$v.form.groupPicture.$error' tag='p') The group picture must be a valid url

  .card
    label.field
      .c-label-container
        i18n.label What is the name of your group?
        char-length-indicator(
          v-if='group.groupName'
          :current-length='group.groupName.length || 0'
          :max='config.nameMaxChar'
          :error='$v.form.groupName.$error'
        )

      input.input.is-large.is-primary(
        ref='name'
        type='text'
        name='groupName'
        :maxlength='config.nameMaxChar'
        :class='{ error: $v.form.groupName.$error }'
        :value='group.groupName'
        @input='updateName'
        @keyup.enter='next'
        data-test='groupName'
        v-error:groupName=''
      )

    slot
</template>

<script>
import sbp from '@sbp/sbp'
import Avatar from '@components/Avatar.vue'
import CharLengthIndicator from '@components/CharLengthIndicator.vue'
import { OPEN_MODAL, AVATAR_EDITED } from '@utils/events.js'
import { imageDataURItoBlob } from '@utils/image.js'
import { GROUP_NAME_MAX_CHAR } from '@model/contracts/shared/constants.js'

export default ({
  name: 'GroupName',
  props: {
    group: { type: Object },
    $v: { type: Object }
  },
  data () {
    return {
      config: {
        nameMaxChar: GROUP_NAME_MAX_CHAR
      }
    }
  },
  inject: ['$assistant'],
  components: {
    Avatar,
    CharLengthIndicator
  },
  watch: {
    'groupInitials': function (initials) {
      this.updatePictureCanvas(initials)
    }
  },
  beforeMount () {
    sbp('okTurtles.events/on', AVATAR_EDITED, this.updateGroupPictureByEditor)
  },
  mounted () {
    window.setTimeout(() => {
      // An arbitrary delay here is to fix the issue #2020.
      // See the PR description here for the details: https://github.com/okTurtles/group-income/pull/2036#issue-2332505747
      this.$refs.name.focus()
    }, 300)

    const c = this.$refs.pictureCanvas
    c.width = 256
    c.height = 256

    // Recover the saved picture, in case user is coming back to this step.
    if (this.$assistant.ephemeral.groupPictureType === 'image') {
      this.$refs.pictureAvatar.setFromBlob(this.$assistant.ephemeral.groupPictureFile)
    } else {
      this.updatePictureCanvas(this.groupInitials)
    }
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', AVATAR_EDITED, this.updateGroupPictureByEditor)

    if (this.$assistant.ephemeral.groupPictureType !== 'image') {
      const pictureBase64 = this.$refs.pictureCanvas.toDataURL('image/png')
      this.$v.form.groupPicture.$touch()
      this.$assistant.ephemeral.groupPictureFile = imageDataURItoBlob(pictureBase64)
      this.$assistant.ephemeral.groupPictureType = 'canvas'
    }
  },
  computed: {
    groupInitials () {
      const intialsCombined = str => str.split(/\s+/) // 1. Split the groupname by white-space.
        .map(segment => segment.match(/\b\w/)?.[0] || '') // 2. Extract intial from each segment.
        .join('').toUpperCase() // 3. Combine them & uppercase it.

      return this.group.groupName
        ? intialsCombined(this.group.groupName).slice(0, 2) ?? ''
        : ''
    }
  },
  methods: {
    updatePictureCanvas (initials) {
      const c = this.$refs.pictureCanvas
      const ctx = c.getContext('2d')
      ctx.rect(0, 0, 256, 256)
      ctx.fillStyle = '#7a7a7a'
      ctx.fill()

      ctx.font = '140px Lato'
      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.fillText(initials, 256 / 2, 180)
    },
    updateName (e) {
      this.$v.form.groupName.$touch()
      this.$emit('input', {
        data: {
          groupName: e.target.value
        }
      })
    },
    updateGroupPictureByEditor ({ blob }) {
      this.$v.form.groupPicture.$touch()
      this.$assistant.ephemeral.groupPictureFile = blob
      this.$refs.pictureAvatar.setFromBlob(blob)
      this.$assistant.ephemeral.groupPictureType = 'image'
    },
    next (e) {
      this.$v.form[e.target.name].$touch()
      if (!this.$v.form[e.target.name].$invalid) {
        this.$emit('next')
      }
    },
    fileChange (files) {
      if (!files.length) return

      const imageUrl = URL.createObjectURL(files[0])
      sbp('okTurtles.events/emit', OPEN_MODAL, 'AvatarEditorModal', { imageUrl })
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.avatar {
  height: 10rem;
  margin: 2.5rem auto 2rem auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;

  .link {
    display: inline-block;
    margin-top: 0.5rem;
  }
}

.c-pictureCanvas {
  position: absolute;
  background: $text_1;
  width: 8rem;
  height: 8rem;
  border-radius: 50%;

  &.isHidden {
    opacity: 0;
    pointer-events: none;
  }
}

.groupPictureInput {
  position: absolute;
  opacity: 0;
}

.c-label-container {
  position: relative;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}
</style>
