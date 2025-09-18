<template lang="pug">
.c-video-viewer-modal
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
        src='https://okturtles.org/videos/group_income_ending_big_tech_control.mp4'
        mimeType='video/mp4'
      )
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
    }
  },
  data () {
    return {
      ephemeral: {
        videosToShow: [],
        deletingVideos: [],
        currentIndex: 0
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
  background-color: $general_0;
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr;

  @include from($tablet) {
    width: 92.5vw;
    height: auto;
    max-height: 90vh;
    max-width: 68rem;
    aspect-ratio: 4/3;
    border-radius: 0.375rem;
  }
}

.c-modal-header {
  @include media-viewer-modal-header;
  position: relative;
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
  height: 100%;
  width: 100%;
  display: grid;
  place-content: center;
}

.c-video-player {
  @include from($tablet) {
    aspect-ratio: 17/9;
  }
}
</style>
