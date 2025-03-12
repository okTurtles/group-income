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
</template>

<script>
import { L } from '@common/common.js'
import SliderContinuous from '@components/SliderContinuous.vue'

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
  methods: {
    handleVolumeUpdate (e) {
      this.ephemeral.volume = e.target.value
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-desc {
  margin: 1rem 0;
}
</style>
