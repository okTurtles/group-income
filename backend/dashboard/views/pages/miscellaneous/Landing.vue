<template lang="pug">
.c-landing-page
  canvas.c-canvas(ref='canvas' :class='{ "in": canvasIn }')
  .c-panel(:class='{ "in": contentIn }')
    i18n.is-title-1.c-title.mt-4(tag='h1') Chelonia
    i18n.is-title-1.c-title(tag='h1') Dashboard
    i18n.c-button.is-outlined.mt-3(tag='button' @click='onButtonClick') To dashboard
</template>

<script>
import { initAnimation, terminateAnimation } from '@view-utils/3d-animation/landing/index.js'

export default {
  name: 'Landing',
  data () {
    return {
      canvasIn: false,
      contentIn: false
    }
  },
  methods: {
    onButtonClick () {
      this.canvasIn = false
      this.contentIn = false

      setTimeout(() => { this.$router.replace({ path: '/main' }) }, 1000)
    }
  },
  mounted () {
    initAnimation(this.$refs.canvas, this.$store.state.theme)

    setTimeout(() => { this.canvasIn = true }, 50)
    setTimeout(() => { this.contentIn = true }, 800)
  },
  beforeDestroy () {
    terminateAnimation()
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

$bezier: cubic-bezier(0.47, 0.47, 0.52, 0.86);

.c-landing-page {
  position: absolute;
  display: block;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.c-canvas {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 1000ms linear;

  @include phone {
    height: 80vh;
    min-height: 100vw;
  }

  &.in {
    opacity: 1;
    transition: opacity 1900ms linear;
  }
}

.c-panel {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(247, 249, 251, 0.45);

  @include if-dark-theme {
    background-color: rgba(47, 47, 47, 0.385);
  }
}

.c-title {
  position: relative;
  text-align: center;
  font-size: 3.75rem;
  line-height: 1.4;
  opacity: 0;
  transform: translateY(3rem);
  transition:
    opacity 700ms $bezier,
    transform 700ms $bezier;
  transition-delay: 160ms;

  &:nth-of-type(2) {
    transition-delay: 80ms;
  }

  @include phone {
    font-size: 2.5rem;
    line-height: 1.275;
  }
}

.in .c-title {
  opacity: 1;
  transform: translateY(0);

  &:first-of-type {
    transition-delay: 0ms;
  }
}

.c-button {
  position: relative;
  padding: 1rem 1.5rem;
  font-weight: 600;
  background-color: $background_0;
  box-shadow: 0 0 16px rgba(186, 186, 186, 0.45);
  opacity: 0;
  transform: translateY(100%);
  transition:
    opacity 700ms $bezier,
    transform 700ms $bezier,
    box-shadow 120ms linear,
    border-color 120ms linear;

  .in & {
    opacity: 1;
    transform: translateY(0);
    transition-delay: 160ms, 160ms, 0ms, 0ms;
  }

  &:hover,
  &:active {
    box-shadow: 0 0 12px rgba(196, 196, 196, 0.325);
    background-color: $background_0;
  }

  @include phone {
    padding: 0.625rem 1.125rem;
  }

  @include if-dark-theme {
    background-color: $primary_blue;
    color: $text_black;
    box-shadow: none;

    &:hover {
      border-color: none;
      box-shadow: 0 0 6px $primary_blue;
    }
  }
}
</style>
