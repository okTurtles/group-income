<template lang='pug'>
  // Leave in the DOM for debug
  div(style='display: block;')
    img(:src='ephemeral.avatarBase64')
</template>
<script>
import blockies from '@utils/blockies.js'
import Colors from '@model/colors.js'
import { randomIntFromRange } from '~/frontend/utils/giLodash.js'

export default {
  name: 'AvatarGenerator',
  props: {},
  data: () => ({
    config: {
      colorOptions: ['primary', 'warning', 'danger', 'success']
    },
    ephemeral: {
      avatarBase64: null
    }
  }),
  created () {
    const theme = Colors.light
    const randomColorIndex = randomIntFromRange(0, this.config.colorOptions.length - 1)
    const palette = this.config.colorOptions[randomColorIndex]

    try {
      const avatarCanvas = blockies.create({
        bgcolor: theme[`${palette}_0`], // darkest
        color: theme[`${palette}_1`], // medium
        spotcolor: theme[`${palette}_2`], // lightest
        size: 6,
        scale: 12
      })
      const avatarBase64 = avatarCanvas.toDataURL('image/png')
      this.ephemeral.avatarBase64 = avatarBase64
      this.$emit('generated', avatarBase64)
    } catch (e) {
      // This will fail in old browsers (e.g. IE, Opera Mini, etc...)
      console.warn('AvatarGenerato.vue created() error:', e)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
