<template lang='pug'>
.wrapper(data-test='rulesStep')
  i18n.steps-title(tag='h4') 3. Voting Rules

  .card
    i18n.label(tag='label') What percentage approval is necessary to adjust the group rules?

    .c-rules
      .c-rule
        p.c-percent
          span.c-pourcent-number {{ group.changeThreshold | toPercent }}
          | %
        circle-slider.circle-slider(
          :value='group.changeThreshold'
          @input='value => update("changeThreshold", value)'
          :min='0.01'
          :max='1'
          :step-size='0.01'
          :side='156'
          :circleWidth='4'
          :progressWidth='4'
          :knobRadius='12'
          :progressColor='changeColor'
          :knobColor='changeColor'
          circleColor='#F4F8E7'
        )
        i18n.subtitle(tag='p') Change Rules

      .c-rule
        p.c-percent
          span.c-pourcent-number {{ group.memberApprovalThreshold | toPercent }}
          | %
        circle-slider.circle-slider(
          :value='group.memberApprovalThreshold'
          @input='value => update("memberApprovalThreshold", value)'
          :min='0.01'
          :max='1'
          :step-size='0.01'
          :side='156'
          :circleWidth='4'
          :progressWidth='4'
          :knobRadius='12'
          :progressColor='approveColor'
          :knobColor='approveColor'
          circleColor='#F4F8E7'
        )
        i18n.subtitle(tag='p') Add Member

      .c-rule
        p.c-percent
          span.c-pourcent-number {{ group.memberRemovalThreshold | toPercent }}
          | %
        circle-slider.circle-slider(
          :value='group.memberRemovalThreshold'
          @input='value => update("memberRemovalThreshold", value)'
          :min='0.01'
          :max='1'
          :step-size='0.01'
          :side='156'
          :circleWidth='4'
          :progressWidth='4'
          :knobRadius='12'
          :progressColor='removeColor'
          :knobColor='removeColor'
          circleColor='#F4F8E7'
        )
        i18n.subtitle(tag='p') Remove Member

    transition(name='slidedown')
      message(
        v-if='!superMajority'
        severity='warning'
      )
        i18n The percentage value you are choosing is most likely too low for a decision that can have a potentially significant impact  on a person&rsquo;s life. Please consider using a supermajority 175.
        i18n(
          tag='a'
          class='link'
          href='https://groupincome.org/2016/09/deprecating-mays-theorem/#when-majority-rule-can-harm'
          target='_blank'
        ) Read more on our blog about the dangers of majority rule.
    slot
</template>

<script>
import { toPercent } from '@view-utils/filters.js'
import { CircleSlider } from '@components/CircularSlider/index.js'
import Message from '../Message.vue'
import { mapGetters } from 'vuex'

const SUPERMAJORITY = 0.67

export default {
  name: 'GroupRules',
  props: {
    group: { type: Object },
    vForm: { type: Object }
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
      this.vForm[prop].$touch()
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
@import "@assets/style/_variables.scss";

.c-rules {
  display: flex;
  font-family: 'Poppins';
}

.c-rule {
  position: relative;
  width: 9.8rem;
  height: 9.8rem;
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
  border-bottom: 2px solid $general_0;
  min-width: 57px;
  margin: 3px 4px 8px 0;
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
