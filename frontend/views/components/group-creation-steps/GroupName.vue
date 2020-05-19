<template lang='pug'>
.wrapper
  i18n.is-title-4.steps-title(tag='h4') 1. Create a new group

  label.avatar(for='groupPicture')
    canvas.c-pictureCanvas(ref='pictureCanvas' :class='{isHidden: !!$assistant.ephemeral.groupPictureFile }')
    avatar.c-pictureAvatar(ref='pictureAvatar' size='xl' src='/assets/images/group-default-avatar.png')

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
    i18n.label(tag='label') What is the name of your group?

    input.input.is-large.is-primary(
      ref='name'
      type='text'
      name='groupName'
      :class='{ error: $v.form.groupName.$error }'
      :value='group.groupName'
      @input='update'
      @keyup.enter='next'
      data-test='groupName'
    )

    slot
</template>

<script>
import Avatar from '@components/Avatar.vue'
import { b64toBlob } from '@utils/imageUpload.js'

export default {
  name: 'GroupName',
  props: {
    group: { type: Object },
    $v: { type: Object }
  },
  inject: ['$assistant'],
  components: {
    Avatar
  },
  watch: {
    'groupInitials': function (initials) {
      this.updatePictureCanvas(initials)
    }
  },
  mounted () {
    this.$refs.name.focus()
    const c = this.$refs.pictureCanvas
    c.width = 128
    c.height = 128
    this.updatePictureCanvas(this.groupInitials)
  },
  beforeDestroy () {
    if (!this.$assistant.ephemeral.groupPictureFile) {
      const pictureBase64 = this.$refs.pictureCanvas.toDataURL('image/png')
      this.$v.form.groupPicture.$touch()
      this.$assistant.ephemeral.groupPictureFile = b64toBlob(pictureBase64)
    }
  },
  computed: {
    groupInitials () {
      return this.group.groupName ? this.group.groupName.match(/\b(\w)/g).join('').slice(0, 2).toUpperCase() : ''
    }
  },
  methods: {
    updatePictureCanvas (initials) {
      const c = this.$refs.pictureCanvas
      const ctx = c.getContext('2d')
      ctx.rect(0, 0, 128, 128)
      ctx.fillStyle = '#7a7a7a'
      ctx.fill()

      ctx.font = '78px Lato'
      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.fillText(initials, 128 / 2, 95)
    },
    update (e) {
      this.$v.form.groupName.$touch()
      this.$emit('input', {
        data: {
          groupName: e.target.value
        }
      })
    },
    next (e) {
      this.$v.form[e.target.name].$touch()
      if (!this.$v.form[e.target.name].$invalid) {
        this.$emit('next')
      }
    },
    fileChange (files) {
      if (!files.length) return
      this.$v.form.groupPicture.$touch()
      this.$assistant.ephemeral.groupPictureFile = files[0]
      this.$refs.pictureAvatar.setFromBlob(files[0])
    }
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.username {
  display: none;
  margin-bottom: 2rem;
  color: $text_1;

  @include tablet {
    display: block;
  }
}

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
</style>
