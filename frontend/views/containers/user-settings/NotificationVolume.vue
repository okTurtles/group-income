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
    ...mapGetters(['ourPreferences'])
  },
  methods: {
    handleVolumeUpdate (e) {
      this.ephemeral.volume = e.target.value
      this.debouncedStoreUpdate()
    },
    debouncedStoreUpdate: debounce(function () {
      sbp(
        'gi.actions/identity/kv/updateNotificationVolume',
        { volume: this.ephemeral.volume / 100 }
      )
    }, 350)
  },
  created () {
    this.ephemeral.volume = (this.ourPreferences.notificationVolume || 1) * 100
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-desc {
  margin: 1rem 0;
}
</style>
