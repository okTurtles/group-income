<template lang='pug'>
  div
    slider-continuous.c-slider(
      :class='ephemeral.sliderClass'
      :uid='type'
      :label='config[type].slideLabel'
      :min='config[type].slideMin'
      :max='config[type].slideMax'
      :unit='config[type].slideUnit'
      :value='value'
      @input='handleInput'
    )
    // [1] - inner el has paddings. A wrap is needed for a smooth transition.
    transition-expand
      div(v-if='warnMajority') <!-- [1] -->
        banner-simple.c-banner(severity='warning')
          i18n The percentage value you are choosing is most likely too low for a decision that can have a potentially significant impact  on a person's life. Please consider using a
          | &nbsp;
          i18n(
            tag='a'
            class='link'
            href='https://groupincome.org/2016/09/deprecating-mays-theorem/#when-majority-rule-can-harm'
            target='_blank'
          ) supermajority threshold.
</template>

<script>
import L from '@view-utils/translations.js'
import BannerSimple from '@components/banners/BannerSimple.vue'
import SliderContinuous from '@components/SliderContinuous.vue'
import TransitionExpand from '@components/TransitionExpand.vue'

const SUPERMAJORITY = 0.67

export default {
  name: 'VotingSystemInput',
  components: {
    BannerSimple,
    SliderContinuous,
    TransitionExpand
  },
  props: {
    type: String, // 'threshold' or 'disagreement'
    value: [String, Number]
  },
  data: () => ({
    config: {
      threshold: {
        slideLabel: L('What percentage of members need to agree?'),
        slideMin: 0,
        slideMax: 100,
        slideUnit: '%'
      },
      disagreement: {
        slideLabel: L('Maximum number of “no” votes'),
        slideMin: 0,
        slideMax: 60,
        slideUnit: ''
      }
    },
    ephemeral: {
      sliderClass: ''
    }
  }),
  computed: {
    warnMajority () {
      return this.type === 'threshold' && this.value / 100 < SUPERMAJORITY
    }
  },
  methods: {
    handleInput (e) {
      this.$emit('update', e.target.value)
      this.ephemeral.sliderClass = this.warnMajority ? 'is-warning' : ''
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-slider {
  &.is-warning ::v-deep .slider {
    color: $warning_0;
  }
}

.c-banner {
  margin-top: 1.5rem;
}
</style>
