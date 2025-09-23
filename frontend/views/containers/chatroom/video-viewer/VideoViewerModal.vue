<template lang="pug">
.c-video-viewer-modal(@click.stop='clickBackDrop')
  .c-video-viewer-content
    header.c-modal-header
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
      video-player.c-video-player(
        :src='currentVideo.videoUrl'
        :mimeType='currentVideo.mimeType'
        :options='config.plyrOptions'
      )
</template>

<script>
import { mapGetters } from 'vuex'
import { L } from '@common/common.js'
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
    }
  },
  data () {
    return {
      ephemeral: {
        videosToShow: [],
        deletingVideos: [],
        currentIndex: 0
      },
      config: {
        plyrOptions: {
          controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen']
        }
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
      const contractID = this.currentVideo.ownerID
      return this.globalProfile(contractID)?.displayName ||
        this.usernameFromID(contractID)
    },
    deletingCurrentVideo () {
      return this.ephemeral.deletingVideos.includes(this.currentVideo.manifestCid)
    }
  },
  methods: {
    displayFilesize (size) {
      return `(${formatBytesDecimal(size)})`
    },
    close () {
      sbp('okTurtles.events/emit', CLOSE_MODAL, 'VideoViewerModal')
    },
    showComingSoon () {
      alert(L('Under development!'))
    },
    clickBackDrop (e) {
      const element = document.elementFromPoint(e.clientX, e.clientY).closest('.c-video-viewer-content')
      if (!element) {
        this.close()
      }
    }
  },
  created () {
    if (!Array.isArray(this.videos)) {
      this.$nextTick(() => this.close())
    } else {
      this.ephemeral.currentIndex = this.initialIndex || 0
      this.ephemeral.videosToShow = this.videos
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
@import "@assets/style/components/_media-viewer_utils.scss";

.c-video-viewer-modal {
  @include media-viewer-modal-container($zindex:$zindex-modal);
}

.c-video-viewer-content {
  @include media-viewer-modal-content;
  background-color: var(--viewer-bg-color);
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "c-header"
    "c-body";

  @include from($tablet) {
    grid-template-rows: auto auto;
    width: 92.5vw;
    height: auto;
    max-height: 90vh;
    max-width: 68rem;
    border-radius: 0.375rem;
  }
}

.c-modal-header {
  @include media-viewer-modal-header;
  position: relative;
  grid-area: c-header;
}

button.c-close-btn {
  position: absolute;
  right: 0.75rem;
  top: 1rem;
  background-color: $general_1;
  color: $text_0;
}

.c-video-viewer-body {
  grid-area: c-body;
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;

  @include from($tablet) {
    display: block;
    aspect-ratio: 16/9;
  }
}

.c-video-player {
  display: block;
  width: 100%;
  max-height: 100%;
  aspect-ratio: 16/9;
  transform: translateY(-1.5rem);

  @include from($tablet) {
    transform: translateY(0);
  }
}
</style>
