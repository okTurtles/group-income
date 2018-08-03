<template>
  <div class="gi-voting-sign">
    <svg class="gi-voting-sign-svg"
      v-if="isTypeRule"
    >
      <circle cx="36" cy="36" r="35"
        class="gi-voting-sign-svg-circle"
        :style="svgCircle.style"
        :class="svgCircle.class"
      />
    </svg>

    <p class="gi-voting-sign-value title is-size-4 has-text-centered"
      :class="{
        'gi-is-mincome': isTypeMincome,
        'gi-is-rule': isTypeRule
      }"
      v-if="isTypeRuleOrMincome"
    >
      {{valuePerc}}
    </p>

    <user-image class="gi-voting-sign-avatar"
      :username="value"
      v-if="isTypeMember"
    />
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

%avatarSize {
  width: 4.5rem;
  height: 4.5rem;
}

.gi-voting-sign {
  position: relative;
  flex-shrink: 0;

  &-avatar,
  &-value {
    @extend %avatarSize;
    border-radius: 50%;
    line-height: 4.5rem;
    white-space: nowrap;

    &.gi-is-mincome {
      line-height: 2;
    }

    &.gi-is-rule {
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
import { votingType } from '../../utils/validators'
import { toPercent } from '../../utils/filters'
import UserImage from '../../containers/UserImage.vue'
import contracts from '../../../model/contracts.js'
const { TypeInvitation, TypeRemoval, TypeIncome, TypeChangeThreshold, TypeApprovalThreshold, TypeRemovalThreshold } = contracts.GroupProposal

export default {
  name: 'Sign',
  props: {
    type: {
      validator: votingType
    },
    value: [Number, String],
    member: Object // picture, name
  },
  components: {
    UserImage
  },
  computed: {
    svgCircle () {
      const svgCircleP = 220 // 35*2 * 3.14
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
      return [TypeInvitation, TypeRemoval].includes(this.type)
    },
    isTypeRule () {
      return [TypeChangeThreshold, TypeApprovalThreshold, TypeRemovalThreshold].includes(this.type)
    },
    isTypeMincome () {
      return this.type === TypeIncome
    },
    isTypeRuleOrMincome () {
      return this.isTypeRule || this.isTypeMincome
    },
    valuePerc () {
      return this.isTypeRule ? toPercent(this.value) : this.value
    }
  }
}
</script>
