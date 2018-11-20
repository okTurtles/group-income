<template>
  <div class="c-voting-sign">
    <svg class="c-voting-sign-svg"
      v-if="isTypeRule"
    >
      <circle cx="32" cy="32" r="31"
        class="c-voting-sign-svg-circle"
        :style="svgCircle.style"
        :class="svgCircle.class"
      />
    </svg>

    <p class="c-voting-sign-value title is-size-4 has-text-centered"
      :class="{
        'c-is-mincome': isTypeMincome,
        'c-is-rule': isTypeRule
      }"
      v-if="isTypeRuleOrMincome"
    >
      {{valuePerc}}
    </p>

    <avatar class="c-voting-sign-avatar"
      :src="member.picture"
      :alt="`${member.name}'s avatar`"
      size="xl"
      v-if="isTypeMember"
    />
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

%avatarSize {
  width: $gi-spacer-xl;
  height: $gi-spacer-xl;
}

.c-voting-sign {
  position: relative;
  flex-shrink: 0;

  &-avatar,
  &-value {
    @extend %avatarSize;
    border-radius: 50%;
    line-height: $gi-spacer-xl;
    white-space: nowrap;

    &.c-is-mincome {
      line-height: 2;
    }

    &.c-is-rule {
      border: 1px solid $grey-lighter;
    }
  }

  &-svg {
    @extend %avatarSize;
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 50%;
    transform: rotate(-90deg);

    &-circle {
      stroke: $success;
      stroke-width: 2px;
      stroke-linecap: round;
      fill: transparent;

      &.has-stroke-warning {
        stroke: $tertiary;
      }
    }
  }
}
</style>
<script>
import Avatar from '../Avatar.vue'
import { votingType } from '../../utils/validators'
import { toPercent } from '../../utils/filters'

export default {
  name: 'Sign',
  components: { Avatar },
  props: {
    type: {
      validator: votingType
    },
    value: [Number, String],
    member: Object // picture, name
  },
  computed: {
    svgCircle () {
      const svgCircleP = 32 * 2 * 3.14
      const ruleVal = this.value
      const ruleWarning = 0.7

      return {
        style: {
          strokeDasharray: `${svgCircleP * ruleVal} ${svgCircleP}`
        },
        class: ruleVal < ruleWarning && 'has-stroke-warning'
      }
    },
    isTypeMember () {
      return this.type === 'member'
    },
    isTypeRule () {
      return this.type === 'rule'
    },
    isTypeMincome () {
      return this.type === 'mincome'
    },
    isTypeRuleOrMincome () {
      return ['rule', 'mincome'].includes(this.type)
    },
    valuePerc () {
      return this.isTypeRule ? toPercent(this.value) : this.value
    }
  }
}
</script>
