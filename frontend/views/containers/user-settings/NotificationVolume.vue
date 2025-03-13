<template lang='pug'>
section.card
  i18n.is-title-3.c-title(tag='h2') Volume
  p.c-desc.has-text-1 {{ config.label }}
  slider-continuous.c-volume-slider(
    uid='notification-volume'
    :min='config.sliderMin'
    :max='config.sliderMax'
    :unit='config.sliderUnit'
    :value='ephemeral.volume'
    @input='handleVolumeUpdate'
  )

  audio(ref='exampleAudio'
    src='/assets/audio/msg-received.mp3'
    type='audio/mpeg'
  )
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { L } from '@common/common.js'
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
        label: L('Adjust the volume of the notification sound.'),
        sliderMin: 1,
        sliderMax: 100,
        sliderUnit: '%'
      },
      ephemeral: {
        volume: 100
      }
    }
  },
  computed: {
    ...mapGetters(['ourPreferences']),
    volumeFromStore () {
      return this.ourPreferences.notificationVolume || 1
    }
  },
  methods: {
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
      sbp('gi.actions/identity/kv/updateNotificationVolume', { volume })
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

.c-desc {
  margin: 1rem 0;
}
</style>
