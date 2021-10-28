<template lang='pug'>
  div
    slider-continuous.c-slider(
      :class='ephemeral.sliderClass'
      :uid='rule'
      :label='config[rule].sliderLabel'
      :min='config[rule].sliderMin'
      :max='config[rule].sliderMax'
      :unit='config[rule].sliderUnit'
      :value='sliderValue'
      @input='handleInput'
    )

    transition-expand
      // inner el has paddings. A wrap is needed for a smooth transition.
      div(v-if='warnMajority')
        banner-simple.c-banner(severity='warning')
          i18n(
            :args='{ a_:`<a class="link" href="https://groupincome.org/2016/09/deprecating-mays-theorem/#when-majority-rule-can-harm" target="_blank">`, _a: "</a>" }'
          ) The percentage value you are choosing is most likely too low for a decision that can have a potentially significant impact on a person's life. Please consider using a {a_}supermajority threshold{_a}.
</template>

<script>
import L from '@view-utils/translations.js'
import { RULE_PERCENTAGE, RULE_DISAGREEMENT, getPercentFromDecimal } from '@model/contracts/voting/rules.js'
import BannerSimple from '@components/banners/BannerSimple.vue'
import SliderContinuous from '@components/SliderContinuous.vue'
import TransitionExpand from '@components/TransitionExpand.vue'

const SUPERMAJORITY = 0.60

export default ({
  name: 'VotingRulesInput',
  components: {
    BannerSimple,
    SliderContinuous,
    TransitionExpand
  },
  props: {
    rule: {
      type: String,
      validator: (rule) => [RULE_PERCENTAGE, RULE_DISAGREEMENT].includes(rule)
    },
    value: [String, Number]
  },
  data: () => ({
    config: {
      [RULE_PERCENTAGE]: {
        sliderLabel: L('What percentage of members need to agree?'),
        sliderMin: 0,
        sliderMax: 100,
        sliderUnit: '%'
      },
      [RULE_DISAGREEMENT]: {
        sliderLabel: L('"No" votes required to block a proposal'),
        sliderMin: 1,
        sliderMax: 60,
        sliderUnit: ''
      }
    },
    ephemeral: {
      sliderClass: ''
    }
  }),
  created () {
    this.ephemeral.sliderClass = this.warnMajority ? 'is-warning' : ''
  },
  watch: {
    value (value) {
      this.ephemeral.sliderClass = this.warnMajority ? 'is-warning' : ''
    }
  },
  computed: {
    sliderValue () {
      if (this.rule === RULE_PERCENTAGE) {
        return getPercentFromDecimal(this.value)
      }
      return this.value
    },
    warnMajority () {
      return this.rule === RULE_PERCENTAGE && this.value < SUPERMAJORITY
    }
  },
  methods: {
    handleInput (e) {
      const value = this.rule === RULE_PERCENTAGE ? e.target.value / 100 : e.target.value
      this.$emit('update', value)
    }
  }
}: Object)
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
