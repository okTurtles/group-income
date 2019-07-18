<template lang="pug">
div
  p.steps-title
    | 1.&nbsp;
    i18n Create a new group

  label.avatar(for='groupPicture')
    //- TODO: set a default placeholder image using a built-in asset
    avatar(:src='group.groupPicture' @load='imgLoad($event)')
    //- we don't need to add any code to trigger the hidden file input field
    //- because we use this label(for='elem') trick:
    //- https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications#Using_a_label_element_to_trigger_a_hidden_file_input_element
    i18n.link Upload an image

    input.groupPictureInput#groupPicture(
      type='file'
      name='groupPicture'
      accept='image/*'
      :class="{'error': v.groupPicture.$error}"
      @change="fileChange($event.target.files)"
      placeholder='http://'
      data-test='groupPicture'
    )

  p.error(v-if='v.groupPicture.$error')
    i18n
      | The group picture must be a valid url

  label.label
    i18n What is the name of your group?

  input.input.is-large.is-primary(
    ref='name'
    type='text'
    name='groupName'
    :class="{ 'error': v.groupName.$error }"
    :value='group.groupName'
    @input='update'
    @keyup.enter='next'
    data-test='groupName'
  )
</template>

<script>
import Avatar from '@components/Avatar.vue'

export default {
  name: 'GroupName',
  props: {
    group: { type: Object },
    v: { type: Object }
  },
  inject: ['$assistant'],
  components: {
    Avatar
  },
  mounted () {
    this.$refs.name.focus()
  },
  methods: {
    update (e) {
      this.v.groupName.$touch()
      this.$emit('input', {
        data: {
          groupName: e.target.value
        }
      })
    },
    next (e) {
      this.v[e.target.name].$touch()
      if (!this.v[e.target.name].$invalid) {
        this.$emit('next')
      }
    },
    fileChange (fileList) {
      if (!fileList.length) return
      this.v.groupPicture.$touch()
      this.$assistant.ephemeral.groupPictureFile = fileList[0]
      const imageURL = URL.createObjectURL(fileList[0])
      // TODO: call URL.revokeObjectURL(imageURL) per: https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications#Using_object_URLs
      // you can call that in the img.onload function:
      // img.onload = function() { URL.revokeObjectURL(this.src) }
      console.debug('imageURL:', imageURL)
      // we can use the FileReader API to manipulate a thumbnail of the image
      // https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications#Example_Showing_thumbnails_of_user-selected_images
      // And we can add a built-in thumbnail editor, for example:
      // https://hacks.mozilla.org/2011/01/how-to-develop-a-html5-image-uploader/
      // https://github.com/beakerbrowser/fritter/blob/master/com/profile/profile-editor.js
      // https://github.com/beakerbrowser/fritter/blob/master/com/crop-popup.js
      this.$emit('input', {
        data: {
          groupPicture: imageURL
        }
      })
    },
    imgLoad (e) {
      // free this resource per https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications#Using_object_URLs
      URL.revokeObjectURL(e.target.src)
    }
  }
}
</script>

<style lang='scss' scoped>
@import "../../../assets/style/_variables.scss";

.username {
  display: none;
  margin-bottom: $spacer-lg;
  color: $text-light;

  @include tablet {
    display: block;
  }
}

.avatar {
  height: 125px;
  margin: 40px auto 32px auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;

  .c-avatar {
    width: 95px;
    height: 95px;
  }

  .link {
    display: inline-block;
    margin-top: 7px;

    @include tablet {
      display: block;
      margin-top: 0;
    }
  }

  img {
    display: block;
    width: 113px;
    margin: 0 auto;

    @include tablet {
      width: 71px;
    }
  }
}

.groupPictureInput {
  display: none;
}
</style>
