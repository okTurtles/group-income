<template lang="pug">
.c-image-viewer-modal
  .c-image-viewer-content
    .c-image-blurry-background(:style='blurryBgStyles')
    preview-image-area(:img-src='metaData.imgUrl')

    header.c-modal-header
      avatar-user.c-avatar(
        v-if='metaData.ownerID'
        :contractID='metaData.ownerID'
        size='sm'
      )

      .c-img-data
        .c-name.has-ellipsis {{ displayName }}
        .c-filename.has-ellipsis {{ metaData.name }}

      button.is-icon-small.c-close-btn(
        type='button'
        @click.stop='close'
      )
        i.icon-times
</template>

<script>
import { mapGetters } from 'vuex'
import sbp from '@sbp/sbp'
import trapFocus from '@utils/trapFocus.js'
import { CLOSE_MODAL } from '@utils/events.js'
import AvatarUser from '@components/AvatarUser.vue'
import PreviewImageArea from './PreviewImageArea.vue'

export default {
  // NOTE: gave this component a generic name in case this is used outside the chatroom area. (eg. instead of 'ChatImageViewer' etc.)
  name: 'ImageViewerModal',
  mixins: [trapFocus],
  components: {
    AvatarUser,
    PreviewImageArea
  },
  props: {
    metaData: Object
  },
  data () {
    return {
      testImgSrc: '/assets/images/home-bg.jpeg',
      ephemeral: {
        previewImgAttrs: {
          width: undefined,
          height: undefined
        },
        currentZoom: 0,
        showSliderOutput: false
      },
      config: {
        imgData: {
          minWidth: null,
          minHeight: null,
          naturalWidth: null,
          naturalHeight: null,
          aspectRatio: 1 // intrinsic ratio value of width / height
        },
        zoomMin: 0,
        zoomMax: 400, // for now.
        sliderUnit: '%'
      }
    }
  },
  computed: {
    ...mapGetters([
      'globalProfile',
      'usernameFromID'
    ]),
    blurryBgStyles () {
      return {
        backgroundImage: `url(${this.metaData.imgUrl})`
      }
    },
    displayName () {
      const contractID = this.metaData.ownerID
      return this.globalProfile(contractID)?.displayName ||
        this.usernameFromID(contractID)
    }
  },
  created () {
    if (!this.metaData) {
      this.$nextTick(() => this.close())
    }
  },
  mounted () {
    document.addEventListener('keydown', this.trapFocus)
  },
  beforeDestroy () {
    document.removeEventListener('keydown', this.trapFocus)
  },
  methods: {
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL, 'ImageViewerModal')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-image-viewer-modal {
  position: fixed;
  z-index: $zindex-modal;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  overflow: auto;
  background-color: rgba(10, 10, 10, 0.86);
}

.c-image-viewer-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: $general_0;
  width: 100%;
  height: 100%;
  overflow: hidden;

  @include from($tablet) {
    border-radius: 0.375rem;
    width: 92.5vw;
    height: 90vh;
  }
}

.c-modal-header {
  position: absolute;
  width: 100%;
  top: 0;
  left: 0;
  height: auto;
  z-index: 3;
  padding: 1rem;
  padding-right: 3rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  column-gap: 0.75rem;

  > * {
    z-index: 1;
  }

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 135%;
    background: linear-gradient(#1e2021bb, #1e202100);
    z-index: 0;
  }

  .c-avatar {
    flex-shrink: 0;
  }

  .c-img-data {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    line-height: 1.125;
  }

  .c-name {
    font-size: $size_4;
    font-weight: 700;
  }

  .c-filename {
    font-size: $size_5;
    color: $text_1;
  }
}

.c-image-blurry-background {
  position: absolute;
  display: block;
  pointer-events: none;
  filter: blur(50px) brightness(0.4);
  background-position: 50%;
  background-size: contain;
  background-repeat: no-repeat;
  background-color: $general_0;
  inset: -100px;
}

.c-close-btn {
  position: absolute;
  right: 0.75rem;
  top: 1rem;
  background-color: $general_1;

  &:hover,
  &:focus {
    background-color: $general_2;
  }
}
</style>
