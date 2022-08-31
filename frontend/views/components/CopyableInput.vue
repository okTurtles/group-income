<template lang="pug">
.inputgroup.c-wrapper(
  :class='{ "is-uneditable": uneditable }'
)
  input.input.c-input(
    ref='input'
    :value='value'
    @input='onInput'
    @keyup.enter='copyToClipboard'
  )
  .addons
    button.is-icon.c-btn(
      :aria-lebel='L("Copy string")'
      @click='copyToClipboard'
    )
      i.icon-copy
  tooltip.c-feedback(
    v-if='ephemeral.isTooltipActive'
    :class='`is-direction-${tooltipDirection}`'
    :isVisible='true'
    :direction='tooltipDirection'
    :text='L("Copied to clipboard!")'
  )
</template>

<script>
import Tooltip from '@components/Tooltip.vue'

export default ({
  name: 'CopyableInput',
  components: {
    Tooltip
  },
  props: {
    value: { required: true },
    uneditable: {
      type: Boolean,
      required: false,
      default: false
    },
    tooltipDirection: {
      type: String,
      required: false,
      default: 'bottom'
    }
  },
  data () {
    return {
      ephemeral: {
        isTooltipActive: false
      }
    }
  },
  methods: {
    onInput (e) {
      this.$emit('input', e.target.value)
    },
    copyToClipboard () {
      const showTooltip = () => {
        this.ephemeral.isTooltipActive = true

        setTimeout(() => {
          this.ephemeral.isTooltipActive = false
        }, 1200)
      }

      if (navigator.clipboard) {
        navigator.clipboard.writeText(this.value)
          .then(showTooltip)
      } else {
        document.execCommand('copy')
        showTooltip()
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-input {
  font-size: $size_4;
  height: 2rem;
  padding: 0 0.5rem;
  padding-right: 2.25rem;
  min-width: 10.875rem;

  .is-uneditable & {
    pointer-events: none;
  }
}

button.c-btn {
  font-size: $size_4;
  width: 2rem !important;
  border-left: 1px solid $general_0;
}

.c-feedback {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);

  &.is-direction-bottom {
    transform: translateX(-50%) translateY(0.25rem);
  }

  &.is-direction-top {
    transform: translateX(-50%) translateY(-0.25rem);
  }
}
</style>
