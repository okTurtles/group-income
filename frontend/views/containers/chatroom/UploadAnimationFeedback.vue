<template lang="pug">
.c-attachments-feedback(:style='styles')
  .c-upload-animation-container
    svg(
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 50 50'
      preserveAspectRatio='xMidYMid meet'
    )
      circle.c-circle(cx='25' cy='25' r='20')

    i.icon-arrow-up.c-arrow-icon

  i18n.c-attachments-feedback-text(tag='div') Uploading attachments...

  button.is-unstyled.c-cancel-button(
    type='button'
    :aria-label='L("Cancel upload")'
    @click.stop='cancelUpload'
  )
    i.icon-times
</template>

<script>
import sbp from '@sbp/sbp'
import { CHATROOM_CANCEL_UPLOAD_ATTACHMENTS } from '~/frontend/utils/events.js'

export default {
  name: 'UploadAnimationFeedback',
  props: {
    size: {
      type: String,
      default: '1em'
    },
    messageHash: String
  },
  computed: {
    styles () {
      return {
        '--size': this.size
      }
    }
  },
  methods: {
    cancelUpload () {
      sbp('okTurtles.events/emit', CHATROOM_CANCEL_UPLOAD_ATTACHMENTS, this.messageHash)
      this.$emit('cancel-upload')
    }
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
  flex-shrink: 0;

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

button.c-cancel-button {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  color: $danger_0;
  border: 1px solid currentColor;
  margin-left: 0.25rem;

  i {
    font-size: calc(var(--size) * 0.375);
  }

  &:hover,
  &:focus {
    color: $danger_2;
    background-color: $danger_0;
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
