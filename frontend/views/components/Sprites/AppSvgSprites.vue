<template lang='pug'>
.l-sprite
  component(
    v-for='(sprite) in ephemeral.loadedSprites'
    :key='sprite'
    :is='sprite'
  )
  </template>
<script>
import sbp from '~/shared/sbp.js'
import { LOAD_SPRITE } from '@utils/events.js'

export default {
  name: 'LoadSvgSprites',
  data () {
    return {
      ephemeral: {
        loadedSprites: []
      }
    }
  },
  created () {
    sbp('okTurtles.events/on', LOAD_SPRITE, name => this.loadSprite(`SvgSprite${name}`))
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', LOAD_SPRITE)
  },
  methods: {
    loadSprite (name) {
      const { loadedSprites } = this.ephemeral

      // debugger // eslint-disable-line
      if (loadedSprites.indexOf(name) === -1) {
        loadedSprites.push(name)
      }
    }
  }

}
</script>
