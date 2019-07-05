<template lang="pug">
div
  p.steps-title
    | 1.&nbsp;
    i18n Create a new group

  label.avatar(for='groupPicture')
    avatar(:src='group.groupPicture')
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
      console.log(URL.createObjectURL(fileList[0]))
      this.$emit('input', {
        data: {
          groupPicture: URL.createObjectURL(fileList[0])
        }
      })
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
