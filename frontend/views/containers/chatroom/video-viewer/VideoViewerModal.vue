<template lang="pug">
.c-video-viewer-modal
  .c-video-viewer-content(
    :class='{ "nav-buttons-hidden": ephemeral.hideCtas.navButtons }'
    @mouseenter='onMouseEnter'
    @mouseleave='onMouseLeave'
  )
    header.c-modal-header(:class='{ "is-hidden": ephemeral.hideCtas.header }')
      template(v-if='currentVideo')
        avatar-user.c-avatar(
          v-if='currentVideo.ownerID'
          :contractID='currentVideo.ownerID'
          size='sm'
        )

        .media-data
          .name.has-ellipsis {{ displayName }}
          .filename-and-size
            .filename.has-ellipsis {{ currentVideo.name }}
            .file-size {{ displayFilesize(currentVideo.size) }}

      button.is-icon-small.c-close-btn(
        type='button'
        @click.stop='close'
      )
        i.icon-times

    section.c-video-viewer-body
      .c-video-viewer-body-inner
        video-player.c-video-player.for-video-modal(
          v-if='currentVideo'
          ref='videoPlayer'
          :class='{ "is-taller-than-wider": ephemeral.isVideoTallerThanWider }'
          :key='currentVideo.videoUrl'
          :src='currentVideo.videoUrl'
          :mimeType='currentVideo.mimeType'
          :initialTime='ephemeral.currentIndex === initialIndex ? initialTime : undefined'
          @play='onVideoPlay'
          @pause='onVideoPause'
          @dimension-resolved='onVideoDimensionsResolved'
          @enterfullscreen='onVideoFullscreenChange'
          @exitfullscreen='onVideoFullscreenChange'
        )

      button.is-icon.c-video-nav-btn.is-prev(
        v-if='showPrevButton'
        @click='selectPrevVideo'
        title='L("Previous video")'
        aria-label='L("Previous video")'
        type='button'
      )
        i.icon-chevron-left

      button.is-icon.c-video-nav-btn.is-next(
        v-if='showNextButton'
        @click='selectNextVideo'
        title='L("Next video")'
        aria-label='L("Next video")'
        type='button'
      )
        i.icon-chevron-right
</template>

<script>
import { mapGetters } from 'vuex'
import sbp from '@sbp/sbp'
import { CLOSE_MODAL } from '@utils/events.js'
import AvatarUser from '@components/AvatarUser.vue'
import VideoPlayer from '@containers/chatroom/video-viewer/VideoPlayer.vue'
import trapFocus from '@utils/trapFocus.js'
import { formatBytesDecimal } from '@view-utils/filters.js'

export default {
  name: 'VideoViewerModal',
  mixins: [trapFocus],
  components: {
    AvatarUser,
    VideoPlayer
  },
  props: {
    videos: Array,
    initialIndex: {
      type: Number,
      required: false,
      default: 0
    },
    canDelete: {
      type: Boolean,
      default: false
    },
    deleting: {
      type: Boolean,
      default: false
    },
    initialTime: {
      type: Number,
      required: false
    }
  },
  data () {
    return {
      ephemeral: {
        videosToShow: [],
        currentIndex: 0,
        isVideoTallerThanWider: false,
        hideCtas: {
          header: false,
          navButtons: false
        },
        hideCta: false
      },
      matchMedia: {
        handler: null,
        isDesktop: false
      }
    }
  },
  computed: {
    ...mapGetters([
      'globalProfile',
      'usernameFromID'
    ]),
    currentVideo () {
      return this.ephemeral.videosToShow[this.ephemeral.currentIndex]
    },
    displayName () {
      if (!this.currentVideo) {
        return ''
      }

      const contractID = this.currentVideo.ownerID
      return this.globalProfile(contractID)?.displayName ||
        this.usernameFromID(contractID)
    },
    showPrevButton () {
      const len = this.ephemeral.videosToShow.length
      return len > 1 && this.ephemeral.currentIndex > 0
    },
    showNextButton () {
      const len = this.ephemeral.videosToShow.length
      return len > 1 && this.ephemeral.currentIndex < len - 1
    }
  },
  methods: {
    displayFilesize (size) {
      return `(${formatBytesDecimal(size)})`
    },
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL, 'VideoViewerModal')
    },
    initMatchMedia () {
      this.matchMedia.handler = window.matchMedia('(min-width: 769px) and (hover: hover) and (pointer: fine)')
      this.matchMedia.handler.onchange = (e) => {
        this.matchMedia.isDesktop = e.matches
      }
      this.matchMedia.isDesktop = this.matchMedia.handler.matches
    },
    onMouseEnter () {
      this.ephemeral.hideCtas.header = false
      this.ephemeral.hideCtas.navButtons = false
    },
    onVideoPlay () {
      if (this.matchMedia.isDesktop) {
        this.ephemeral.hideCtas.header = true
      }
      this.ephemeral.hideCtas.navButtons = true
    },
    onVideoPause () {
      this.ephemeral.hideCtas.header = false
      this.ephemeral.hideCtas.navButtons = false
    },
    onVideoFullscreenChange () {
      const currentActiveElement = document.activeElement
      if (currentActiveElement && currentActiveElement.matches('[data-plyr="fullscreen"]')) {
        currentActiveElement.blur()
      }
    },
    onMouseLeave () {
      if (this.matchMedia.isDesktop && this.$refs.videoPlayer.isPlaying()) {
        this.ephemeral.hideCtas.header = true
        this.ephemeral.hideCtas.navButtons = true
      }
    },
    selectNextVideo () {
      if (this.ephemeral.currentIndex < this.ephemeral.videosToShow.length - 1) {
        this.ephemeral.currentIndex += 1
      }
    },
    selectPrevVideo () {
      if (this.ephemeral.currentIndex > 0) {
        this.ephemeral.currentIndex -= 1
      }
    },
    keyUpHandler (e) {
      if (e.code === 'Space') {
        this.$refs.videoPlayer.togglePlay()
      }
    },
    onVideoDimensionsResolved ({ w, h }) {
      this.ephemeral.isVideoTallerThanWider = h > w
    }
  },
  created () {
    if (!Array.isArray(this.videos)) {
      this.$nextTick(() => this.close())
    } else {
      this.ephemeral.currentIndex = this.initialIndex || 0
      this.ephemeral.videosToShow = this.videos

      this.initMatchMedia()
    }
  },
  mounted () {
    window.addEventListener('keyup', this.keyUpHandler)
  },
  beforeDestroy () {
    if (this.matchMedia.handler) {
      this.matchMedia.handler.onchange = null
    }
    window.removeEventListener('keyup', this.keyUpHandler)
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
@import "@assets/style/components/_media-viewer_utils.scss";

.c-video-viewer-modal {
  @include media-viewer-modal-container($zindex:$zindex-modal);
  display: flex;
  flex-direction: column;

  .is-dark-theme & {
    --viewer-bg-color: var(--general_2);
  }

  @include from($tablet) {
    display: block;
  }
}

.c-video-viewer-content {
  @include media-viewer-modal-content;
  background-color: var(--viewer-bg-color);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  flex-grow: 1;

  @include from($tablet) {
    display: block;
    width: 92.5vw;
    height: auto;
    max-height: 90vh;
    max-width: 68rem;
    border-radius: 0.375rem;
  }
}

.c-modal-header {
  @include media-viewer-modal-header;
  position: absolute;
  transition: transform 350ms ease-in-out;
  flex-shrink: 0;

  &::after {
    background: linear-gradient(rgba(0, 0, 0, 0.7490196078) 10%, rgba(0, 0, 0, 0));
    height: 120%;
  }

  .is-hidden {
    transform: translateY(-200%);
  }
}

button.c-close-btn {
  position: absolute;
  right: 0.75rem;
  top: 1rem;
  background-color: $general_1;
  color: $text_0;
}

.c-video-viewer-body {
  position: relative;
  width: 100%;
  flex-grow: 1;
  max-height: 100%;
  min-height: 0;
}

.c-video-viewer-body-inner {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;

  @include from($tablet) {
    display: block;
    aspect-ratio: 16/9;
    flex-grow: unset;
  }
}

.c-video-player {
  display: block;
  width: 100%;
  max-height: 100%;
  aspect-ratio: 16/9;
  transform: translateY(-2rem);

  &.is-taller-than-wider {
    transform: translateY(0);
  }

  @include from($tablet) {
    transform: translateY(0);
  }
}

button.c-video-nav-btn {
  @include media-viewer-navigation-btn;
  transition:
    opacity 350ms ease-in-out,
    box-shadow 150ms ease-in-out;

  .nav-buttons-hidden & {
    opacity: 0;
    pointer-events: none;
  }

  &.is-prev {
    left: 1.5rem;
  }

  &.is-next {
    right: 1.5rem;
  }

  &:hover,
  &:focus {
    box-shadow: 0 0 0 2px var(--viewer-cta-box-shadow-color);
  }

  @include phone {
    width: 2rem;
    height: 2rem;
    font-size: 0.75rem;

    &.is-prev {
      left: 0.75rem;
    }

    &.is-next {
      right: 0.75rem;
    }
  }
}
</style>
