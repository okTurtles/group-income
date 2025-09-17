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

    p TODO!
</template>

<script>
import { mapGetters } from 'vuex'
import sbp from '@sbp/sbp'
import { CLOSE_MODAL } from '@utils/events.js'
import AvatarUser from '@components/AvatarUser.vue'
import trapFocus from '@utils/trapFocus.js'
import { formatBytesDecimal } from '@view-utils/filters.js'

export default {
  name: 'VideoViewerModal',
  mixins: [trapFocus],
  components: {
    AvatarUser
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
}

.c-modal-header {
  @include media-viewer-modal-header;
}

button.c-close-btn {
  position: absolute;
  right: 0.75rem;
  top: 1rem;
  background-color: $general_1;
  color: $text_0;
}
</style>
