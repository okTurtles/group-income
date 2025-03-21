<template lang='pug'>
.c-notification-volume
  i18n.c-title Volume
  .c-volume-slider-container
    slider-continuous.c-volume-slider(
      uid='notification-volume'
      :min='config.sliderMin'
      :max='config.sliderMax'
      :unit='config.sliderUnit'
      :hideText='true'
      :value='ephemeral.volume'
      @input='handleVolumeUpdate'
    )

    .c-volume-value {{ ephemeral.volume }}{{ config.sliderUnit }}

  audio(ref='exampleAudio'
    src='/assets/audio/msg-received.mp3'
    type='audio/mpeg'
  )
</template>

<script>
import { mapMutations } from 'vuex'
import SliderContinuous from '@components/SliderContinuous.vue'
import { debounce } from 'turtledash'

export default ({
  name: 'NotificationVolume',
  components: {
    SliderContinuous
  },
  data () {
    return {
      config: {
        sliderMin: 0,
        sliderMax: 100,
        sliderUnit: '%'
      },
      ephemeral: {
        volume: 100
      }
    }
  },
  computed: {
    volumeFromStore () {
      return this.$store.getters.notificationVolume ?? 1
    }
  },
  methods: {
    ...mapMutations(['setNotificationVolume']),
    handleVolumeUpdate (e) {
      this.ephemeral.volume = e.target.value
      this.debouncedPostVolumeChange()
    },
    debouncedPostVolumeChange: debounce(function () {
      // 1. Play the example sound for the user to hear the change.
      const volume = this.ephemeral.volume / 100
      const audioEl = this.$refs.exampleAudio

      // In case the sound is still playing when the volume is chnaged, pause and reset the playhead first.
      audioEl.pause()
      audioEl.currentTime = 0
      audioEl.volume = volume
      setTimeout(() => { audioEl.play() }, 10)

      // 2. Update the value in the store, so that the update propagates to the background sound.
      this.setNotificationVolume(volume)
    }, 350)
  },
  created () {
    this.ephemeral.volume = Math.round(this.volumeFromStore * 100)
  },
  mounted () {
    // Speed up the play speed of the example sound a little bit, so that user can play it more frequently.
    this.$refs.exampleAudio.playbackRate = 1.25
    // Init the volume of the example sound to the value in the store.
    this.$refs.exampleAudio.volume = this.volumeFromStore
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-notification-volume {
  position: relative;
}

.c-title {
  font-size: $size_4;
  font-weight: bold;
}

.c-volume-slider-container {
  position: relative;
  display: flex;
  align-items: flex-end;
  column-gap: 0.5rem;

  .c-volume-slider {
    flex-grow: 1;

    ::v-deep .marks {
      margin-top: 1rem;
    }
  }

  .c-volume-value {
    position: relative;
    font-size: $size_4;
    color: $text_1;
    flex-shrink: 0;
  }
}
</style>
