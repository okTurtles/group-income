<template lang='pug'>
.wrapper
  label.label(:for='`range${uid}`') {{ label }}

  span.marks
    span.edge(aria-hidden='true') {{ min }}

    span.slider(:style='ephemeral.styleVars')
      input.sInput(
        type='range'
        :id='`range${uid}`'
        :min='min'
        :max='max'
        :value='value'
        @input='handleChange'
      )
      output.sOutput(
        :for='`range${uid}`'
        :style='ephemeral.outputStyle'
      ) {{ value + unit }}

    span.edge(aria-hidden='true') {{ max }}
</template>

<script>
export default ({
  name: 'SliderContinuous',
  props: {
    /** Unique id to connect form and label */
    uid: {
      type: String,
      required: true
    },
    label: String,
    min: [String, Number],
    max: [String, Number],
    unit: String,
    value: [String, Number]
  },
  data: () => ({
    ephemeral: {
      styleVars: ''
    }
  }),
  created () {
    this.updateSlider(this.value)
  },
  methods: {
    getPercent (value) {
      // ex: min: 50, max: 100 // getPercent(75) -> 50
      return ((value - this.min) / (this.max - this.min) * 100).toFixed(2)
    },
    getFactor (percent) {
      return ((percent / 100 - 0.5) * -1).toFixed(2)
    },
    handleChange (e) {
      this.updateSlider(e.target.value)
      this.$emit('input', e)
    },
    updateSlider (value) {
      const percent = this.getPercent(value)
      this.ephemeral.styleVars = `--percent: ${percent}%; --factor: ${this.getFactor(percent)};`
    }
  }
}: Object)
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

$rangeSize: 1rem;

.wrapper {
  position: relative;
}

.marks {
  position: relative;
  display: flex;
  justify-content: space-between;
  color: $text_1;
  margin-top: 2rem;
}

.slider {
  position: relative;
  flex: 1;

  // affects input color and may be overridden by parent component.
  color: $primary_0;

  // Updated by JS
  --percent: 0; // controls the thumb position
  --factor: 0; // used to align correctly the .sOutput
}

.sInput {
  position: relative;
  -webkit-appearance: none;
  width: 100%;
  height: 0.25rem;
  border-radius: 0.25rem;
  color: currentColor;
  outline: none;
  background: $general_0; // fallback
  background: linear-gradient(to right, currentColor var(--percent, 0), $general_0 var(--percent, 0));

  @mixin rangeThumb {
    width: $rangeSize;
    height: $rangeSize;
    border: none;
    border-radius: 50%;
    background: currentColor;
    transition: transform 200ms;
    cursor: pointer;

    &:hover {
      transform: scale(1.2);
    }
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    @include rangeThumb;
  }

  &::-moz-range-thumb {
    @include rangeThumb;
  }
}

.sOutput {
  position: absolute;
  top: -1.5rem;
  left: var(--percent);
  background: $background;
  color: currentColor;
  transform: translateX(calc(-50% + var(--factor) * #{$rangeSize}));
}

.edge {
  &:first-child {
    margin-right: 0.5rem;
  }

  &:last-child {
    margin-left: 0.5rem;
  }
}
</style>
