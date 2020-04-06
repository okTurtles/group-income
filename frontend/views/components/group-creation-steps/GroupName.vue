<template lang='pug'>
.wrapper
  i18n.is-title-4.steps-title(tag='h4') 1. Create a new group

  label.avatar(for='groupPicture')
    avatar(ref='picture' size='xl' src='/assets/images/default-group-avatar.png')
    //- we don't need to add any code to trigger the hidden file input field
    //- because we use this label(for='elem') trick:
    //- https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications#Using_a_label_element_to_trigger_a_hidden_file_input_element
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
  mounted () {
    this.$refs.name.focus()
  },
  methods: {
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
      this.$refs.picture.setFromBlob(files[0])
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

.groupPictureInput {
  display: none;
}
</style>
