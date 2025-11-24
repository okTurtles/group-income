<template lang="pug">
.c-attachments-feedback
  .c-upload-animation-container(:style='styles')
    svg(
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 50 50'
      preserveAspectRatio='xMidYMid meet'
    )
      circle.c-circle(cx='25' cy='25' r='20')

    i.icon-arrow-up.c-arrow-icon

  .c-attachments-feedback-text(ref='feedbackTxt') {{ config.uploadingText }}
</template>

<script>
import { L } from '@common/common.js'

export default {
  name: 'UploadAnimationFeedback',
  props: {
    size: {
      type: String,
      default: '1em'
    }
  },
  data () {
    return {
      config: {
        uploadingText: L('Uploading attachments')
      },
      intervalId: null,
      dotCount: 0
    }
  },
  computed: {
    styles () {
      return {
        '--size': this.size
      }
    }
  },
  mounted () {
    this.intervalId = setInterval(() => {
      this.$refs.feedbackTxt.textContent = this.config.uploadingText + '.'.repeat(this.dotCount)
      this.dotCount = (this.dotCount + 1) % 4
    }, 350)
  },
  beforeDestroy () {
    clearInterval(this.intervalId)
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-attachments-feedback {
  position: relative;
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: $text_1;

  &-text {
    font-size: $size_5;
  }
}

.c-upload-animation-container {
  position: relative;
  width: var(--size);
  height: var(--size);

  svg {
    display: block;
    width: var(--size);
    height: var(--size);
    transform-origin: center;
    animation: ani-svg 5s linear infinite;
  }

  .c-circle {
    fill: $general_1;
    stroke: currentColor;
    stroke-width: 2px;
    stroke-dasharray: 125, 125;
    stroke-dashoffset: 0;
    animation: ani-circle 2s ease-out infinite;
  }

  .c-arrow-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    transform-origin: center;
    font-size: calc(var(--size) * 0.375);
    color: currentColor;
    animation: ani-arrow 2s linear infinite;
  }
}

@keyframes ani-svg {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes ani-circle {
  0% { stroke-dashoffset: 0; }
  50% { stroke-dashoffset: -125; }
  100% { stroke-dashoffset: -250; }
}

@keyframes ani-arrow {
  0% { transform: translate(-50%, -42.5%); }
  50% { transform: translate(-50%, -57.5%); }
  100% { transform: translate(-50%, -42.5%); }
}
</style>
