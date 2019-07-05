<template lang="pug">
.c-group-rules(data-test='rulesStep')
  p.steps-title
    | 3.&nbsp;
    i18n  Voting Rules

  label.label
    i18n What percentage approval is necessary to adjust the group rules?

  .c-rules
    .c-rule
      p.c-percent
        span.c-pourcent-number {{ group.changeThreshold | toPercent }}
        | %
      circle-slider.circle-slider(
        :value='group.changeThreshold'
        @input="value => update('changeThreshold', value)"
        :min='0.01'
        :max='1'
        :step-size='0.01'
        :side='175'
        :circleWidth='4'
        :progressWidth='4'
        :knobRadius='12'
        :progressColor="changeColor"
        :knobColor="changeColor"
        circleColor='#F4F8E7'
      )
      p.subtitle
        i18n Change Rules

    .c-rule
      p.c-percent
        span.c-pourcent-number {{ group.memberApprovalThreshold | toPercent }}
        | %
      circle-slider.circle-slider(
        :value='group.memberApprovalThreshold'
        @input="value => update('memberApprovalThreshold', value)"
        :min='0.01'
        :max='1'
        :step-size='0.01'
        :side='175'
        :circleWidth='4'
        :progressWidth='4'
        :knobRadius='12'
        :progressColor="approveColor"
        :knobColor="approveColor"
        circleColor='#F4F8E7'
      )
      p.subtitle
        i18n Add Member

    .c-rule
      p.c-percent
        span.c-pourcent-number {{ group.memberRemovalThreshold | toPercent }}
        | %
      circle-slider.circle-slider(
        :value='group.memberRemovalThreshold'
        @input="value => update('memberRemovalThreshold', value)"
        :min='0.01'
        :max='1'
        :step-size='0.01'
        :side='175'
        :circleWidth='4'
        :progressWidth='4'
        :knobRadius='12'
        :progressColor="removeColor"
        :knobColor="removeColor"
        circleColor='#F4F8E7'
      )
      p.subtitle
        i18n Remove Member

  transition(name='slidedown')
    message(
      v-if='!superMajority'
      severity='warning'
    )
      i18n
        | The percentage value you are choosing is most likely too low
        | for a decision that can have a potentially significant impact
        | on a person&rsquo;s life. Please consider using a supermajority 175.
      | &nbsp;
      a.link(
        href='https://groupincome.org/2016/09/deprecating-mays-theorem/#when-majority-rule-can-harm'
        target='_blank'
      )
        i18n Read more on our blog about the dangers of majority rule.
</template>

<script>
import { toPercent } from '@view-utils/filters.js'
import { CircleSlider } from '@components/CircularSlider/index.js'
import Message from '../Message.vue'

const SUPERMAJORITY = 0.67
const OKCOLOR = '#A0D10E'
const WARNCOLOR = '#f68b39'

export default {
  name: 'GroupRules',
  props: {
    group: { type: Object },
    v: { type: Object }
  },
  components: {
    CircleSlider,
    Message
  },
  filters: {
    toPercent
  },
  methods: {
    update (prop, value) {
      this.v[prop].$touch()
      this.$emit('input', {
        data: {
          [prop]: value
        }
      })
    }
  },
  computed: {
    changeColor: function () {
      return this.group.changeThreshold >= SUPERMAJORITY ? OKCOLOR : WARNCOLOR
    },
    approveColor: function () {
      return this.group.memberApprovalThreshold >= SUPERMAJORITY ? OKCOLOR : WARNCOLOR
    },
    removeColor: function () {
      return this.group.memberRemovalThreshold >= SUPERMAJORITY ? OKCOLOR : WARNCOLOR
    },
    superMajority: function () {
      return this.group.changeThreshold >= SUPERMAJORITY &&
             this.group.memberApprovalThreshold >= SUPERMAJORITY &&
             this.group.memberRemovalThreshold >= SUPERMAJORITY
    }
  },
  mounted () {
    this.$emit('focusref', 'finish')
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-rules {
  display: flex;
}

.c-rule {
  position: relative;
  width: 175px;
  height: 160px;
  margin: 40px auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.c-percent {
  font-size: $size-extra-large;
  font-weight: bold;
  margin: 0;
}

.c-pourcent-number {
  display: inline-block;
  padding-bottom: 5px;
  border-bottom: 2px solid grey;
  min-width: 57px;
  margin-bottom: 8px;
  margin-top: 3px;
}

.subtitle {
  margin: 0;
}

.circle-slider {
  position: absolute;
  top: 0;
  left: 0;
}

.rulesStep .message-body {
  border-color: #f68b39;
}
</style>
