<template lang='pug'>
.wrapper(data-test='rulesStep')
  i18n.is-title-4.steps-title(tag='h4') 4. Voting System

  .card
    fieldset.c-step
      i18n.has-text-bold(tag='legend') Which voting system would you like to use?
      i18n.has-text-1.c-desc(tag='p') You will need to use this system to vote on proposals. You can propose for example, to add or remove members, or to change your group’s mincome value.

      .c-box(v-for='option in group.ruleOrder' :class='{isActive: form.option === option }')
        .c-box-option
          label.checkbox.c-option
            input.input(type='radio' name='rule' :value='option' @change='setOption(option)')
            span
              span.has-text-bold {{ config[option].optionLabel }}
              span.help(v-html='config[option].optionHint')
          img.c-box-img(src='/assets/images/rule-placeholder.png' alt='')

        // [1] - Keep div so that transition works smoothly with inner paddings.
        transition-expand
          div(v-if='form.option === option') <!-- [1] -->
            .sliderRange.c-range
              span.label(:for='`range${option}`') {{ config[option].rangeLabel }}

              span.sliderRange-marks
                span.sliderRange-edge(aria-hidden='true') {{ config[option].rangeMin + config[option].rangeUnit }}
                span.sliderRange-slider(:style='ephemeral.rangeInputStyle')
                  input.sliderRange-input(
                    type='range'
                    :id='`range${option}`'
                    :min='config[option].rangeMin'
                    :max='config[option].rangeMax'
                    :style='ephemeral.rangeInputClass'
                    v-model='form.value'
                    @input='(e) => setValue(e.target.value)'
                  )
                  output.sliderRange-output(
                    :for='`range${option}`'
                    :style='ephemeral.rangeTextStyle'
                    :class='ephemeral.rangeTextClass'
                  ) {{ form.value + config[option].rangeUnit }}
                span.sliderRange-edge(aria-hidden='true') {{ config[option].rangeMax + config[option].rangeUnit }}

            transition-expand
              div(v-if='warnMajority')
                banner-simple.c-banner(severity='warning')
                  i18n The percentage value you are choosing is most likely too low for a decision that can have a potentially significant impact  on a person's life. Please consider using a
                  | &nbsp;
                  i18n(
                    tag='a'
                    class='link'
                    href='https://groupincome.org/2016/09/deprecating-mays-theorem/#when-majority-rule-can-harm'
                    target='_blank'
                  ) supermajority threshold.

      i18n.help You can change this later in your Group Settings.
    slot
</template>

<script>
import { mapGetters } from 'vuex'
import L, { LTags } from '@view-utils/translations.js'
import BannerSimple from '@components/banners/BannerSimple.vue'
import TransitionExpand from '@components/TransitionExpand.vue'

const SUPERMAJORITY = 0.67

export default {
  name: 'GroupRules',
  props: {
    group: { type: Object },
    $v: { type: Object }
  },
  components: {
    BannerSimple,
    TransitionExpand
  },
  data: () => ({
    config: {
      threshold: {
        optionLabel: L('Percentage based'),
        optionHint: L('Define the percentage of members that will need to {b_}agree{_b} to a proposal.', LTags('b')),
        rangeLabel: L('What percentage of members need to agree?'),
        rangeMin: 0,
        rangeMax: 100,
        rangeUnit: '%',
        rangeDefault: 75 // TODO connect to store.
      },
      disagreement: {
        optionLabel: L('Disagreement number'),
        optionHint: L('Define the maximum number of people who can {b_}disagree{_b} on a proposal', LTags('b')),
        rangeLabel: L('Maximum number of “no” votes'),
        rangeMin: 1,
        rangeMax: 60,
        rangeUnit: '',
        rangeDefault: 2
      }
    },
    form: {
      option: null,
      value: null
    },
    ephemeral: {
      rangeInputStyle: null,
      rangeInputClass: null,
      rangeTextClass: null,
      rangeTextStyle: null
    }
  }),
  methods: {
    getPercent (value) {
      const { rangeMin, rangeMax } = this.config[this.form.option]
      // ex: getPercent(75) with a min: 50, max: 100 -> 50
      return ((value - rangeMin) / (rangeMax - rangeMin) * 100).toFixed(2)
    },
    getFactor (percent) {
      return ((percent / 100 - 0.5) * -1).toFixed(2)
    },
    setOption (option) {
      this.form.option = option
      const settings = this.config[this.form.option]
      const percent = this.getPercent(settings.rangeDefault)

      this.form.value = settings.rangeDefault
      this.ephemeral.rangeInputStyle = `--percent: ${percent}%; --factor: ${this.getFactor(percent)};`
      this.ephemeral.rangeInputClass = 'has-background-primary'
      this.ephemeral.rangeTextClass = 'has-text-primary'
      this.ephemeral.rangeTextStyle = `left: ${percent}%;`
    },
    setValue (value) {
      this.form.value = value
      const percent = this.getPercent(value)

      this.ephemeral.rangeInputStyle = `--percent: ${percent}%; --factor: ${this.getFactor(percent)};`
      this.ephemeral.rangeInputClass = 'has-background-primary' // TODO
      this.ephemeral.rangeTextClass = 'has-text-primary' // TODO
      this.ephemeral.rangeTextStyle = `left: ${percent}%;`
    },
    update (prop, value) {
      this.$v.form[prop].$touch()
      this.$emit('input', {
        data: {
          [prop]: value
        }
      })
    }
  },
  computed: {
    ...mapGetters([
      'colors'
    ]),
    changeColor: function () {
      return this.group.changeThreshold >= SUPERMAJORITY ? this.colors.success_0 : this.colors.warning_0
    },
    approveColor: function () {
      return this.group.memberApprovalThreshold >= SUPERMAJORITY ? this.colors.success_0 : this.colors.warning_0
    },
    removeColor: function () {
      return this.group.memberRemovalThreshold >= SUPERMAJORITY ? this.colors.success_0 : this.colors.warning_0
    },
    warnMajority: function () {
      return this.form.option === 'threshold' && this.form.value / 100 < SUPERMAJORITY
      // return this.group.changeThreshold >= SUPERMAJORITY &&
      //        this.group.memberApprovalThreshold >= SUPERMAJORITY &&
      //        this.group.memberRemovalThreshold >= SUPERMAJORITY
    }
  },
  mounted () {
    this.$emit('focusref', 'finish')
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-step {
  margin-bottom: 2rem;
}

.c-desc {
  margin-bottom: 1.5rem;
}

.c-box {
  border: 1px solid $general_0;
  padding: 1.5rem 1rem;
  border-radius: 0.25rem;
  margin-bottom: 1rem;

  &.isActive {
    border-color: $primary_0;
  }

  &-option {
    display: flex;
    align-items: center;
  }

  &-img {
    max-width: 100%;
    margin: -1rem 0;

    @include phone {
      display: none;
    }
  }
}

.c-option {
  flex: 1;

  > :last-child {
    white-space: normal;

    &::before {
      margin-right: 1rem;
    }
  }

  .help {
    display: block;
    margin-left: 1.85rem;
  }
}

.c-range,
.c-banner {
  margin-top: 1rem;

  @include tablet {
    margin-left: 1.8rem;
    width: calc(100% - 1.8rem);
  }
}
</style>
